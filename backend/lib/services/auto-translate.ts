const SUPPORTED_LOCALES = ["zh-CN", "zh-TW", "vi-VN", "en-US"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

type Translation = { name?: string; summary?: string; description?: string };
type TranslationMap = Partial<Record<Locale, Translation>>;

const language = (locale: Locale) => locale === "vi-VN" ? "vi" : locale;

async function translateText(text: string, from: Locale, to: Locale) {
  if (!text.trim() || from === to) return text;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", text);
    url.searchParams.set("langpair", `${language(from)}|${language(to)}`);
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    const payload = await response.json().catch(() => null) as { responseData?: { translatedText?: string } } | null;
    const translated = String(payload?.responseData?.translatedText || "").trim();
    return translated || text;
  } catch {
    // A menu must still be saveable when the free translation service is busy.
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

/** Build complete locale rows once, at item creation time. */
export async function autoTranslateServiceTranslations(input: TranslationMap) {
  const sourceLocale = SUPPORTED_LOCALES.find((locale) => input[locale]?.name?.trim());
  if (!sourceLocale) return input;
  const source = input[sourceLocale]!;
  const output: TranslationMap = { ...input };
  await Promise.all(SUPPORTED_LOCALES.map(async (locale) => {
    if (output[locale]?.name?.trim()) return;
    const [name, summary, description] = await Promise.all([
      translateText(source.name || "", sourceLocale, locale),
      translateText(source.summary || "", sourceLocale, locale),
      translateText(source.description || source.summary || "", sourceLocale, locale),
    ]);
    output[locale] = { name, summary, description };
  }));
  return output;
}
