"""
End-to-end ingestion: PDF -> Storage -> claims -> Supabase.

Usage:
  python scripts/ingest_report.py \
    --pdf ../ml/datasets/raw/reports/INFY_2024_integrated.pdf \
    --name "Infosys Limited" --ticker INFY \
    --country India --sector "Information Technology" \
    --year 2024 --report-title "Integrated Annual Report 2023-24" \
    --report-type integrated
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database.supabase_client import get_supabase_admin
from app.nlp.claim_extractor import extract_claims
from app.nlp.pdf_extractor import extract_pdf
from app.nlp.text_cleaner import segment_sentences
from app.services.claim_service import replace_claims_for_report
from app.services.company_service import upsert_company
from app.services.report_service import update_report_file_metadata, upsert_report
from app.services.storage_service import upload_report_pdf
from app.utils.logging import get_logger

logger = get_logger(__name__)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--pdf", required=True)
    p.add_argument("--name", required=True)
    p.add_argument("--ticker", default=None)
    p.add_argument("--country", default=None)
    p.add_argument("--sector", default=None)
    p.add_argument("--industry", default=None)
    p.add_argument("--website", default=None)
    p.add_argument("--year", type=int, required=True)
    p.add_argument("--report-title", required=True)
    p.add_argument("--report-type", default="integrated")
    p.add_argument("--skip-storage", action="store_true",
                   help="Skip Supabase Storage upload (for offline/debug runs)")
    args = p.parse_args()

    pdf_path = Path(args.pdf).resolve()
    if not pdf_path.exists():
        logger.error("PDF not found: %s", pdf_path)
        sys.exit(1)

    sb = get_supabase_admin()

    # 1. Upsert company
    company = upsert_company(
        sb,
        name=args.name,
        ticker=args.ticker,
        country=args.country,
        sector=args.sector,
        industry=args.industry,
        website=args.website,
    )
    logger.info("Company: %s (id=%s)", company["name"], company["id"])

    # 2. Upsert report row
    report = upsert_report(
        sb,
        company_id=company["id"],
        report_title=args.report_title,
        report_year=args.year,
        report_type=args.report_type,
        file_path=pdf_path.name,
    )
    logger.info("Report: %s (id=%s)", report["report_title"], report["id"])

    # 3. Upload PDF to Storage
    if not args.skip_storage:
        if not company.get("ticker"):
            logger.warning("No ticker set; skipping Storage upload.")
        else:
            meta = upload_report_pdf(
                sb,
                local_path=pdf_path,
                ticker=company["ticker"],
                year=args.year,
            )
            update_report_file_metadata(
                sb,
                report_id=report["id"],
                storage_path=meta["storage_path"],
                size_bytes=meta["size_bytes"],
                checksum=meta["checksum"],
                mime_type=meta["content_type"],
            )
            logger.info("Storage: %s", meta["storage_path"])

    # 4. Extract
    doc = extract_pdf(pdf_path)
    sentences = segment_sentences([(p.page_number, p.text) for p in doc.pages])
    claims = extract_claims(sentences)

    # 5. Persist claims
    inserted = replace_claims_for_report(
        sb,
        company_id=company["id"],
        report_id=report["id"],
        claims=claims,
    )
    logger.info(
        "DONE: %d pages, %d sentences, %d claims persisted for %s",
        doc.total_pages, len(sentences), inserted, company["name"],
    )


if __name__ == "__main__":
    main()
