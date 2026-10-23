local I18n = require("techrat_i18n")

local tests = {}

function tests.portuguese_variants_of_koreader_language_map_to_pt_BR(t)
    t.eq(I18n.locale("pt_BR"), "pt-BR", "pt_BR")
    t.eq(I18n.locale("pt"), "pt-BR", "pt")
    t.eq(I18n.locale("pt_PT"), "pt-BR", "pt_PT")
end

function tests.any_other_language_falls_back_to_english(t)
    t.eq(I18n.locale("en"), "en", "en")
    t.eq(I18n.locale("C"), "en", "C (KOReader's default)")
    t.eq(I18n.locale("es"), "en", "es")
    t.eq(I18n.locale(nil), "en", "nil")
end

function tests.both_languages_have_exactly_the_same_texts(t)
    for key, text in pairs(I18n.texts.en) do
        t.ok(type(I18n.texts["pt-BR"][key]) == "string" and I18n.texts["pt-BR"][key] ~= "", "pt-BR text for " .. key)
        t.ok(text ~= "", "en text for " .. key)
    end
    for key in pairs(I18n.texts["pt-BR"]) do t.ok(I18n.texts.en[key], "en text for " .. key) end
end

function tests.texts_take_arguments(t)
    local en, pt = I18n.new("en"), I18n.new("pt-BR")
    t.eq(en("question_of", 2, 10), "Question 2 of 10", "en")
    t.eq(pt("question_of", 2, 10), "Questão 2 de 10", "pt-BR")
end

return tests
