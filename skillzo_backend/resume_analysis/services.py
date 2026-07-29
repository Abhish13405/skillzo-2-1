"""
resume_analysis/services.py

Extracts raw text from uploaded PDF/DOCX, then hands it to the
shared groq_service (common/groq_service.py) for AI analysis.
"""
import pdfplumber
import docx


def extract_text_from_resume(file_field) -> str:
    """file_field is a Django FieldFile (Resume.file)."""
    name = file_field.name.lower()

    if name.endswith('.pdf'):
        text = []
        with pdfplumber.open(file_field) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text.append(page_text)
        return "\n".join(text)

    elif name.endswith('.docx'):
        document = docx.Document(file_field)
        return "\n".join(p.text for p in document.paragraphs if p.text)

    else:
        raise ValueError("Unsupported file type. Only PDF and DOCX are supported.")
