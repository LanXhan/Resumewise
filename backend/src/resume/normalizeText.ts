
export function normalizeText(text: string): string{
    //Rule 1: Unicode normalization (NFKC)
    text = text.normalize("NFKC");
    //Rule 2: Remove zero-width characters and soft hyphens
    text = text.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "");
    //Rule 3: 
    return text.trim();
}