//first approach is to use unpdf for normalization before passing to LLM 
import { extractText } from "./extractText.js";

export function normalizeText(text: string): string{
    //Rule 1: Unicode normalization (NFKC)
    text = text.normalize("NFKC");
    //Rule 2: Remove control characters (except for newlines)
    text = text.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "");
    //Rule 3: Collapse multiple spaces into one
    return text.trim().replace(/\s+/g, " ");
}