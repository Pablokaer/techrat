using Microsoft.AspNetCore.Identity;
using TechRat.Application.Common;

namespace TechRat.Api.Infrastructure;

/// <summary>ASP.NET Core Identity errors in the request language (English comes from the framework).</summary>
public sealed class LocalizedIdentityErrorDescriber : IdentityErrorDescriber
{
    private static bool IsPt => AppLocales.Current == AppLocales.PortugueseBrazil;

    private static IdentityError Pt(IdentityError english, string portuguese) =>
        new() { Code = english.Code, Description = portuguese };

    public override IdentityError DefaultError() =>
        IsPt ? Pt(base.DefaultError(), "Ocorreu um erro desconhecido.") : base.DefaultError();

    public override IdentityError PasswordMismatch() =>
        IsPt ? Pt(base.PasswordMismatch(), "Senha incorreta.") : base.PasswordMismatch();

    public override IdentityError InvalidToken() =>
        IsPt ? Pt(base.InvalidToken(), "Código inválido ou expirado.") : base.InvalidToken();

    public override IdentityError InvalidUserName(string? userName) =>
        IsPt ? Pt(base.InvalidUserName(userName), $"O nome de usuário '{userName}' é inválido.") : base.InvalidUserName(userName);

    public override IdentityError InvalidEmail(string? email) =>
        IsPt ? Pt(base.InvalidEmail(email), $"O e-mail '{email}' é inválido.") : base.InvalidEmail(email);

    public override IdentityError DuplicateUserName(string userName) =>
        IsPt ? Pt(base.DuplicateUserName(userName), Text.Get(Text.Keys.UsernameTaken)) : base.DuplicateUserName(userName);

    public override IdentityError DuplicateEmail(string email) =>
        IsPt ? Pt(base.DuplicateEmail(email), Text.Get(Text.Keys.EmailTaken)) : base.DuplicateEmail(email);

    public override IdentityError PasswordTooShort(int length) =>
        IsPt ? Pt(base.PasswordTooShort(length), $"A senha deve ter pelo menos {length} caracteres.") : base.PasswordTooShort(length);

    public override IdentityError PasswordRequiresUniqueChars(int uniqueChars) =>
        IsPt ? Pt(base.PasswordRequiresUniqueChars(uniqueChars), $"A senha deve ter pelo menos {uniqueChars} caracteres diferentes.") : base.PasswordRequiresUniqueChars(uniqueChars);

    public override IdentityError PasswordRequiresNonAlphanumeric() =>
        IsPt ? Pt(base.PasswordRequiresNonAlphanumeric(), "A senha deve ter pelo menos um caractere especial.") : base.PasswordRequiresNonAlphanumeric();

    public override IdentityError PasswordRequiresDigit() =>
        IsPt ? Pt(base.PasswordRequiresDigit(), "A senha deve ter pelo menos um número ('0'-'9').") : base.PasswordRequiresDigit();

    public override IdentityError PasswordRequiresLower() =>
        IsPt ? Pt(base.PasswordRequiresLower(), "A senha deve ter pelo menos uma letra minúscula ('a'-'z').") : base.PasswordRequiresLower();

    public override IdentityError PasswordRequiresUpper() =>
        IsPt ? Pt(base.PasswordRequiresUpper(), "A senha deve ter pelo menos uma letra maiúscula ('A'-'Z').") : base.PasswordRequiresUpper();
}
