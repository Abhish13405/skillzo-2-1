"""
resume_analysis/services.py

Extracts raw text from uploaded PDF/DOCX, then hands it to the
shared groq_service (common/groq_service.py) for AI analysis.
"""
import os
import pdfplumber
import pypdfium2 as pdfium
import docx


def extract_text_from_resume(file_field) -> str:
    """file_field is a Django FieldFile (Resume.file)."""
    name = (file_field.name or '').lower()

    # Determine file path if accessible on disk
    file_path = None
    try:
        if hasattr(file_field, 'path') and os.path.exists(file_field.path):
            file_path = file_field.path
    except Exception:
        file_path = None

    if name.endswith('.pdf'):
        extracted_text = []

        # Primary extractor: pdfplumber
        try:
            if file_path:
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        pt = page.extract_text()
                        if pt:
                            extracted_text.append(pt)
            else:
                if hasattr(file_field, 'open'):
                    file_field.open('rb')
                if hasattr(file_field, 'seek'):
                    file_field.seek(0)
                with pdfplumber.open(file_field) as pdf:
                    for page in pdf.pages:
                        pt = page.extract_text()
                        if pt:
                            extracted_text.append(pt)
        except Exception:
            extracted_text = []

        # Fallback extractor: pypdfium2 (high fidelity Chromium PDFium)
        if not extracted_text:
            try:
                target = file_path if file_path else file_field
                if hasattr(target, 'seek'):
                    target.seek(0)
                pdf = pdfium.PdfDocument(target)
                for page in pdf:
                    textpage = page.get_textpage()
                    pt = textpage.get_text_range()
                    if pt and pt.strip():
                        extracted_text.append(pt.strip())
            except Exception:
                pass

        full_text = "\n".join(extracted_text).strip()
        if not full_text:
            raise ValueError(
                "No readable text could be extracted from this PDF. "
                "If this is a scanned image, please upload a document containing selectable text."
            )
        return full_text

    elif name.endswith('.docx'):
        try:
            target = file_path if file_path else file_field
            if hasattr(target, 'open'):
                target.open('rb')
            if hasattr(target, 'seek'):
                target.seek(0)
            document = docx.Document(target)
            lines = [p.text for p in document.paragraphs if p.text and p.text.strip()]
            for table in document.tables:
                for row in table.rows:
                    for cell in row.cells:
                        if cell.text and cell.text.strip():
                            lines.append(cell.text.strip())
            full_text = "\n".join(lines).strip()
            if not full_text:
                raise ValueError("No readable text found in DOCX file.")
            return full_text
        except Exception as e:
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"Could not read DOCX document: {str(e)}")

    else:
        raise ValueError("Unsupported file type. Only PDF (.pdf) and Word (.docx) files are supported.")
