"""Tests for deploy/new-dataprotection-cert.sh (run: python3 -m unittest discover -s deploy -p "test_*.py").

The script makes the certificate that encrypts the Data Protection key ring (ADR-0029) and writes it into an env file.
These tests run the real script and the real openssl, in a throwaway directory.
"""
import base64
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "new-dataprotection-cert.sh"
BASH = shutil.which("bash") or "bash"
OPENSSL = shutil.which("openssl")


def parse(env_file: Path) -> dict:
    values = {}
    for line in env_file.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            key, _, value = line.partition("=")
            values[key] = value
    return values


@unittest.skipUnless(OPENSSL, "openssl is not installed")
class NewDataProtectionCertTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.env_file = self.tmp / ".env"

    def run_script(self, *args):
        env = {**os.environ, "MSYS_NO_PATHCONV": "1"}
        return subprocess.run([BASH, str(SCRIPT), *args], env=env, capture_output=True, text=True, cwd=self.tmp)

    def test_writes_a_certificate_and_its_password_into_a_new_env_file(self):
        r = self.run_script(str(self.env_file))

        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        values = parse(self.env_file)
        self.assertTrue(values["DATAPROTECTION_CERT_BASE64"])
        self.assertGreaterEqual(len(values["DATAPROTECTION_CERT_PASSWORD"]), 24)

    def test_the_value_is_a_pfx_that_the_password_opens_and_that_holds_a_private_key(self):
        self.run_script(str(self.env_file))
        values = parse(self.env_file)
        pfx = self.tmp / "dp.pfx"
        pfx.write_bytes(base64.b64decode(values["DATAPROTECTION_CERT_BASE64"], validate=True))

        opened = subprocess.run(
            [OPENSSL, "pkcs12", "-in", str(pfx), "-passin", f"pass:{values['DATAPROTECTION_CERT_PASSWORD']}", "-nodes"],
            capture_output=True, text=True)

        self.assertEqual(opened.returncode, 0, opened.stderr)
        self.assertIn("BEGIN PRIVATE KEY", opened.stdout)
        self.assertIn("BEGIN CERTIFICATE", opened.stdout)

        wrong = subprocess.run([OPENSSL, "pkcs12", "-in", str(pfx), "-passin", "pass:not-the-password", "-nodes"], capture_output=True, text=True)
        self.assertNotEqual(wrong.returncode, 0)

    def test_the_certificate_is_a_long_lived_rsa_3072_one(self):
        self.run_script(str(self.env_file))
        values = parse(self.env_file)
        pfx = self.tmp / "dp.pfx"
        pfx.write_bytes(base64.b64decode(values["DATAPROTECTION_CERT_BASE64"]))

        text = subprocess.run(
            [OPENSSL, "pkcs12", "-in", str(pfx), "-passin", f"pass:{values['DATAPROTECTION_CERT_PASSWORD']}", "-nokeys", "-clcerts"],
            capture_output=True, text=True).stdout
        info = subprocess.run([OPENSSL, "x509", "-noout", "-text", "-enddate"], input=text, capture_output=True, text=True).stdout

        self.assertIn("3072 bit", info)
        self.assertIn("techrat-dataprotection", info)

    def test_other_settings_in_the_file_are_kept(self):
        self.env_file.write_text("# production\nPOSTGRES_PASSWORD=keep-me\nADMIN_EMAIL=a@b.c\n")

        self.assertEqual(self.run_script(str(self.env_file)).returncode, 0)

        text = self.env_file.read_text()
        self.assertIn("# production\n", text)
        self.assertIn("POSTGRES_PASSWORD=keep-me\n", text)
        self.assertIn("ADMIN_EMAIL=a@b.c\n", text)
        self.assertEqual(text.count("DATAPROTECTION_CERT_BASE64="), 1)

    def test_a_file_without_a_final_newline_is_not_corrupted(self):
        self.env_file.write_text("POSTGRES_PASSWORD=keep-me")

        self.assertEqual(self.run_script(str(self.env_file)).returncode, 0)

        values = parse(self.env_file)
        self.assertEqual(values["POSTGRES_PASSWORD"], "keep-me")
        self.assertIn("DATAPROTECTION_CERT_BASE64", values)

    def test_an_existing_certificate_is_never_replaced_without_force(self):
        self.env_file.write_text("DATAPROTECTION_CERT_BASE64=existing\nDATAPROTECTION_CERT_PASSWORD=existing-pw\n")

        r = self.run_script(str(self.env_file))

        self.assertEqual(r.returncode, 1)
        self.assertIn("--force", r.stderr)
        self.assertEqual(self.env_file.read_text(), "DATAPROTECTION_CERT_BASE64=existing\nDATAPROTECTION_CERT_PASSWORD=existing-pw\n")

    def test_force_replaces_it_and_leaves_one_pair(self):
        self.env_file.write_text("A=1\nDATAPROTECTION_CERT_BASE64=existing\nDATAPROTECTION_CERT_PASSWORD=existing-pw\n")

        r = self.run_script(str(self.env_file), "--force")

        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        text = self.env_file.read_text()
        self.assertNotIn("existing", text)
        self.assertEqual(text.count("DATAPROTECTION_CERT_BASE64="), 1)
        self.assertEqual(text.count("DATAPROTECTION_CERT_PASSWORD="), 1)
        self.assertIn("A=1\n", text)

    def test_secrets_are_never_printed(self):
        r = self.run_script(str(self.env_file))
        values = parse(self.env_file)

        self.assertNotIn(values["DATAPROTECTION_CERT_PASSWORD"], r.stdout + r.stderr)
        self.assertNotIn(values["DATAPROTECTION_CERT_BASE64"][:60], r.stdout + r.stderr)
        self.assertIn("sha256", r.stdout.lower())  # the fingerprint identifies the certificate without exposing it

    @unittest.skipIf(os.name == "nt", "POSIX file modes")
    def test_the_env_file_is_readable_only_by_its_owner(self):
        self.assertEqual(self.run_script(str(self.env_file)).returncode, 0)

        self.assertEqual(self.env_file.stat().st_mode & 0o077, 0)

    def test_no_temporary_files_are_left_next_to_the_env_file(self):
        self.assertEqual(self.run_script(str(self.env_file)).returncode, 0)

        self.assertEqual(sorted(p.name for p in self.tmp.iterdir()), [".env"])

    def test_two_runs_with_force_make_different_certificates(self):
        self.run_script(str(self.env_file))
        first = parse(self.env_file)["DATAPROTECTION_CERT_BASE64"]
        self.run_script(str(self.env_file), "--force")

        self.assertNotEqual(first, parse(self.env_file)["DATAPROTECTION_CERT_BASE64"])

    def test_an_unknown_option_is_refused(self):
        r = self.run_script("--wat")

        self.assertEqual(r.returncode, 2)
        self.assertIn("Usage", r.stderr)


if __name__ == "__main__":
    unittest.main()
