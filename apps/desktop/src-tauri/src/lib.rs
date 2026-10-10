//! TechRat desktop shell. All business logic lives in the backend API; the UI is the shared web app (static export)
//! running in bearer-token mode. The opener plugin lets "Learn more" links open in the user's default browser instead of
//! inside the app window. Three commands let that web app keep its sign-in tokens in the operating system's credential
//! store (ADR-0032) instead of in the webview's `localStorage`.

use keyring::Entry;

/// Every secret of the app is filed under this service name in the credential store.
const SERVICE: &str = "dev.techrat.desktop";

/// Keys the web app uses start with this prefix. The commands refuse anything else, so a script running in the webview
/// cannot use them to read or overwrite other applications' credentials by guessing a name.
const KEY_PREFIX: &str = "techrat.";

/// Longest key accepted; the web app's keys ("techrat.tokens", "techrat.tokens.7") are far shorter.
const MAX_KEY_LEN: usize = 64;

fn check_key(key: &str) -> Result<(), String> {
    let allowed = key.len() <= MAX_KEY_LEN
        && key.starts_with(KEY_PREFIX)
        && key.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-');
    if allowed {
        Ok(())
    } else {
        Err("invalid key".to_string())
    }
}

fn entry(key: &str) -> Result<Entry, String> {
    check_key(key)?;
    Entry::new(SERVICE, key).map_err(|e| e.to_string())
}

/// Stores a value (the web app splits long values into pieces; a Windows credential holds at most 2,560 bytes).
#[tauri::command]
fn secure_set(key: String, value: String) -> Result<(), String> {
    entry(&key)?.set_password(&value).map_err(|e| e.to_string())
}

/// The stored value, or `None` when there is none.
#[tauri::command]
fn secure_get(key: String) -> Result<Option<String>, String> {
    match entry(&key)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Deletes a value; deleting one that does not exist is not an error.
#[tauri::command]
fn secure_remove(key: String) -> Result<(), String> {
    match entry(&key)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![secure_get, secure_set, secure_remove])
        .run(tauri::generate_context!())
        .expect("error while running TechRat");
}

#[cfg(test)]
mod tests {
    use super::check_key;

    #[test]
    fn accepts_the_keys_the_web_app_uses() {
        assert!(check_key("techrat.tokens").is_ok());
        assert!(check_key("techrat.tokens.0").is_ok());
        assert!(check_key("techrat.tokens.63").is_ok());
    }

    #[test]
    fn refuses_names_outside_the_app_prefix() {
        assert!(check_key("").is_err());
        assert!(check_key("tokens").is_err());
        assert!(check_key("other-app.password").is_err());
        assert!(check_key("TECHRAT.tokens").is_err());
    }

    #[test]
    fn refuses_odd_characters_and_very_long_names() {
        assert!(check_key("techrat.tokens/../other").is_err());
        assert!(check_key("techrat.tokens\\x").is_err());
        assert!(check_key("techrat.token s").is_err());
        assert!(check_key(&format!("techrat.{}", "a".repeat(80))).is_err());
    }
}
