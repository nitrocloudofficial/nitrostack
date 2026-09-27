import os
import sys
import json
import requests
import random
import time
import asyncio
import httpx

script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)

from gene_data import GENE_PATHWAYS

_study_cache = {}
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


def make_request_with_retry(url: str, params: dict = None, max_retries: int = 5, backoff_factor: float = 1.0) -> requests.Response:
    headers = {"User-Agent": USER_AGENT}
    for attempt in range(1, max_retries + 1):
        try:
            response = requests.get(url, params=params, headers=headers, timeout=10)
            if response.status_code in (429, 500, 502, 503, 504):
                print(f"Warning: HTTP {response.status_code} on attempt {attempt}/{max_retries} for {url}. Retrying...", flush=True)
                time.sleep(backoff_factor * (2 ** (attempt - 1)))
                continue
            response.raise_for_status()
            return response
        except (requests.exceptions.RequestException, OSError, ConnectionResetError) as e:
            if attempt == max_retries:
                raise e
            sleep_time = backoff_factor * (2 ** (attempt - 1))
            print(f"Warning: Connection/API error ({e}) on attempt {attempt}/{max_retries} for {url}. Retrying in {sleep_time}s...", flush=True)
            time.sleep(sleep_time)
    raise requests.exceptions.RequestException("Max retries exceeded")


def get_snps_for_gene(gene_name: str, max_snps: int = 2) -> list[str]:
    url = "https://www.ebi.ac.uk/gwas/rest/api/singleNucleotidePolymorphisms/search/findByGene"
    params = {"geneName": gene_name, "size": max_snps}
    try:
        response = make_request_with_retry(url, params=params)
        data = response.json()
        snps = data.get("_embedded", {}).get("singleNucleotidePolymorphisms", [])
        return [snp["rsId"] for snp in snps]
    except Exception as e:
        print(f"Could not fetch SNPs for gene {gene_name}: {e}", flush=True)
        return []


def build_target_snps_from_genes(gene_pathways: dict, max_snps_per_gene: int = 2) -> list[str]:
    all_snps = []
    for gene in gene_pathways.keys():
        snps = get_snps_for_gene(gene, max_snps=max_snps_per_gene)
        all_snps.extend(snps)
        print(f"{gene} -> {snps}", flush=True)
    seen = set()
    deduped = []
    for rsid in all_snps:
        if rsid not in seen:
            seen.add(rsid)
            deduped.append(rsid)
    return deduped


def get_study_details_from_link(study_link: str) -> dict:
    if not study_link:
        return {"study_accession": None, "pubmed_id": None, "ancestry": None, "total_sample_size": None}
    if study_link in _study_cache:
        return _study_cache[study_link]
    try:
        response = make_request_with_retry(study_link)
        data = response.json()
        result = _parse_study_response(data)
        _study_cache[study_link] = result
        return result
    except Exception as e:
        print(f"Error fetching study details from {study_link}: {type(e).__name__}: {e}", flush=True)
        return {"study_accession": None, "pubmed_id": None, "ancestry": None, "total_sample_size": None}


def _parse_study_response(data: dict) -> dict:
    """Shared parsing logic for a study API response — used by both sync and async paths."""
    ancestry_details = []
    for anc in data.get("ancestries", []):
        type_ = anc.get("type", "unknown")
        groups = [g.get("ancestralGroup") for g in anc.get("ancestralGroups", []) if g.get("ancestralGroup")]
        num = anc.get("numberOfIndividuals")
        if groups:
            ancestry_details.append(f"{type_}: {', '.join(groups)} (N={num})")
    ancestry = "; ".join(ancestry_details) if ancestry_details else None

    total_sample_size = sum(anc.get("numberOfIndividuals", 0) for anc in data.get("ancestries", []) if anc.get("numberOfIndividuals") is not None)
    if total_sample_size == 0:
        total_sample_size = None

    return {
        "study_accession": data.get("accessionId"),
        "pubmed_id": data.get("publicationInfo", {}).get("pubmedId"),
        "ancestry": ancestry,
        "total_sample_size": total_sample_size
    }


def enrich_with_study_details(entry: dict) -> dict:
    study_link = entry.pop("_study_link", None)
    study_info = get_study_details_from_link(study_link)
    entry["study_accession"] = study_info.get("study_accession")
    entry["pubmed_id"] = study_info.get("pubmed_id")
    entry["ancestry"] = study_info.get("ancestry")
    entry["total_sample_size"] = study_info.get("total_sample_size")
    return entry


async def _get_with_retry_async(url: str, client: httpx.AsyncClient, semaphore: asyncio.Semaphore,
                                 params: dict = None, max_retries: int = 4, backoff_factor: float = 0.5) -> httpx.Response | None:
    """Shared async retry wrapper — used by both association fetch and study-detail fetch,
    so a single transient failure/timeout doesn't kill either one immediately."""
    headers = {"User-Agent": USER_AGENT}
    async with semaphore:
        for attempt in range(1, max_retries + 1):
            try:
                response = await client.get(url, params=params, headers=headers, timeout=15)
                if response.status_code in (429, 500, 502, 503, 504):
                    if attempt == max_retries:
                        print(f"Giving up on {url} after {max_retries} attempts (HTTP {response.status_code})", flush=True)
                        return None
                    await asyncio.sleep(backoff_factor * (2 ** (attempt - 1)))
                    continue
                response.raise_for_status()
                return response
            except Exception as e:
                if attempt == max_retries:
                    print(f"Giving up on {url} after {max_retries} attempts: {type(e).__name__}: {e}", flush=True)
                    return None
                await asyncio.sleep(backoff_factor * (2 ** (attempt - 1)))
    return None


async def fetch_associations_async(rsid: str, client: httpx.AsyncClient, semaphore: asyncio.Semaphore) -> tuple[str, list[dict]]:
    url = f"https://www.ebi.ac.uk/gwas/rest/api/singleNucleotidePolymorphisms/{rsid}/associations"
    params = {"projection": "associationBySnp"}

    response = await _get_with_retry_async(url, client, semaphore, params=params)
    if response is None:
        return rsid, []

    data = response.json()
    associations = data.get("_embedded", {}).get("associations", [])
    results = []

    for assoc in associations:
        mantissa = assoc.get("pvalueMantissa")
        exponent = assoc.get("pvalueExponent")
        pvalue = mantissa * (10 ** exponent) if mantissa is not None and exponent is not None else None
        odds_ratio = assoc.get("orPerCopyNum")
        traits = [t.get("trait") for t in assoc.get("efoTraits", [])]

        risk_allele = None
        gene = None
        risk_frequency = None
        for locus in assoc.get("loci", []):
            alleles = locus.get("strongestRiskAlleles", [])
            if alleles:
                risk_allele = alleles[0].get("riskAlleleName")
                risk_frequency = alleles[0].get("riskFrequency")
            genes = locus.get("authorReportedGenes", [])
            if genes:
                gene = genes[0].get("geneName")

        study_link = assoc.get("_links", {}).get("study", {}).get("href")

        results.append({
            "rsid": rsid, "risk_allele": risk_allele, "gene": gene,
            "risk_allele_frequency": risk_frequency,
            "traits": traits, "odds_ratio": odds_ratio,
            "pvalue_mantissa": mantissa, "pvalue_exponent": exponent, "pvalue": pvalue,
            "_study_link": study_link,
        })

    return rsid, results


async def fetch_all_snps_async(rsids: list[str], max_concurrent: int = 10) -> dict:
    semaphore = asyncio.Semaphore(max_concurrent)
    async with httpx.AsyncClient() as client:
        tasks = [fetch_associations_async(rsid, client, semaphore) for rsid in rsids]
        results = await asyncio.gather(*tasks)
        return dict(results)


def parse_genome_file(filepath: str, target_rsids: list[str]) -> dict:
    target_set = set(target_rsids)
    genotypes = {}
    with open(filepath, "r") as f:
        for line in f:
            line = line.strip()
            if line.startswith("#") or not line:
                continue
            parts = line.split("\t")
            if len(parts) != 4:
                continue
            rsid, chrom, pos, genotype = parts
            if rsid in target_set:
                genotypes[rsid] = genotype
                if len(genotypes) == len(target_set):
                    break
    return genotypes


def calculate_risk_allele_count(genotype: str, risk_allele: str) -> int | None:
    """
    Compares a person's genotype against the known risk allele,
    returns how many copies they carry (0, 1, or 2).
    Returns None (not 0) if the risk allele itself is unknown ('?') —
    that's a real "we don't know" case, not a real zero count.
    """
    risk_letter = risk_allele.split("-")[-1]
    if risk_letter == "?":
        return None
    return genotype.count(risk_letter)


async def analyze_person_variants_async(filepath: str, target_rsids: list[str], max_concurrent: int = 10) -> list[dict]:
    genotypes = parse_genome_file(filepath, target_rsids)
    print(f"Found genotypes for {len(genotypes)}/{len(target_rsids)} target SNPs in file.", flush=True)

    all_associations = await fetch_all_snps_async(list(genotypes.keys()), max_concurrent=max_concurrent)

    results = []
    for rsid, genotype in genotypes.items():
        associations = all_associations.get(rsid, [])
        for assoc in associations:
            if assoc["risk_allele"]:
                risk_count = calculate_risk_allele_count(genotype, assoc["risk_allele"])
                results.append({
                    "rsid": rsid,
                    "genotype": genotype,
                    "risk_allele": assoc["risk_allele"],
                    "risk_allele_count": risk_count,
                    "risk_allele_frequency": assoc.get("risk_allele_frequency"),
                    "gene": assoc["gene"],
                    "trait": assoc["traits"],
                    "odds_ratio": assoc["odds_ratio"],
                    "pvalue": assoc["pvalue"],
                    "pvalue_mantissa": assoc.get("pvalue_mantissa"),
                    "pvalue_exponent": assoc.get("pvalue_exponent"),
                    "_study_link": assoc.get("_study_link"),
                })

    return results


async def get_study_details_from_link_async(study_link: str, client: httpx.AsyncClient, semaphore: asyncio.Semaphore) -> dict:
    if not study_link:
        return {"study_accession": None, "pubmed_id": None, "ancestry": None, "total_sample_size": None}
    if study_link in _study_cache:
        return _study_cache[study_link]

    response = await _get_with_retry_async(study_link, client, semaphore)
    if response is None:
        return {"study_accession": None, "pubmed_id": None, "ancestry": None, "total_sample_size": None}

    result = _parse_study_response(response.json())
    _study_cache[study_link] = result
    return result


async def enrich_entry_async(entry: dict, client: httpx.AsyncClient, semaphore: asyncio.Semaphore) -> dict:
    study_link = entry.pop("_study_link", None)
    study_info = await get_study_details_from_link_async(study_link, client, semaphore)
    entry["study_accession"] = study_info.get("study_accession")
    entry["pubmed_id"] = study_info.get("pubmed_id")
    entry["ancestry"] = study_info.get("ancestry")
    entry["total_sample_size"] = study_info.get("total_sample_size")
    return entry


async def enrich_entries_async(entries: list[dict], max_concurrent: int = 10) -> list[dict]:
    semaphore = asyncio.Semaphore(max_concurrent)
    async with httpx.AsyncClient() as client:
        tasks = [enrich_entry_async(entry, client, semaphore) for entry in entries]
        await asyncio.gather(*tasks)
    return entries


def _dedupe_strongest(results: list[dict]) -> list[dict]:
    """
    Shared dedup logic: keeps only the strongest (smallest p-value) result
    per SNP, tagging how many total studies supported it. Does NOT do
    study-detail enrichment — that's added separately (sync or async).
    """
    best_by_rsid = {}
    all_by_rsid = {}

    for r in results:
        rsid = r["rsid"]
        all_by_rsid.setdefault(rsid, []).append(r)
        best_r = best_by_rsid.get(rsid)
        if best_r is None:
            best_by_rsid[rsid] = r
        else:
            pval1_val = r.get("pvalue") if r.get("pvalue") is not None else 1.0
            pval2_val = best_r.get("pvalue") if best_r.get("pvalue") is not None else 1.0
            if pval1_val < pval2_val:
                best_by_rsid[rsid] = r
            elif pval1_val == pval2_val:
                exp1 = r.get("pvalue_exponent") if r.get("pvalue_exponent") is not None else 0
                exp2 = best_r.get("pvalue_exponent") if best_r.get("pvalue_exponent") is not None else 0
                if exp1 < exp2:
                    best_by_rsid[rsid] = r

    final = []
    for rsid, best in best_by_rsid.items():
        best["supporting_studies_count"] = len(all_by_rsid[rsid])
        final.append(best)
    return final


async def keep_strongest_per_snp_async(results: list[dict], max_concurrent: int = 10) -> list[dict]:
    final = _dedupe_strongest(results)
    await enrich_entries_async(final, max_concurrent=max_concurrent)
    return final


def keep_strongest_per_snp(results: list[dict]) -> list[dict]:
    """
    Dedupes to the strongest result per SNP, then enriches with study
    details. Uses the async (parallel, retrying) path when it's safe to
    start a new event loop; falls back to sync enrichment if we're already
    inside a running loop (e.g. called from an async MCP tool later).
    """
    final = _dedupe_strongest(results)
    try:
        asyncio.get_running_loop()
        # already inside an event loop — can't block with asyncio.run() here,
        # so enrich one at a time synchronously instead
        for best in final:
            enrich_with_study_details(best)
        return final
    except RuntimeError:
        return asyncio.run(enrich_entries_async(final, max_concurrent=10))


def generate_fake_23andme_file(filepath: str, real_snps: list[str], total_rows: int = 600000):
    bases = ["A", "C", "G", "T"]
    with open(filepath, "w") as f:
        f.write("# rsid\tchromosome\tposition\tgenotype\n")
        for i in range(total_rows):
            if i < len(real_snps):
                rsid = real_snps[i]
            else:
                rsid = f"rs{random.randint(1000000, 99999999)}"
            genotype = random.choice(bases) + random.choice(bases)
            f.write(f"{rsid}\t{random.randint(1,22)}\t{random.randint(1,200000000)}\t{genotype}\n")


if __name__ == "__main__":
    if not os.path.exists("resolved_snps.json"):
        print("resolved_snps.json not found — building it from GENE_PATHWAYS...", flush=True)
        target_snps = build_target_snps_from_genes(GENE_PATHWAYS)
        with open("resolved_snps.json", "w") as f:
            json.dump(target_snps, f)
        print(f"Wrote {len(target_snps)} SNPs to resolved_snps.json", flush=True)
    else:
        with open("resolved_snps.json", "r") as f:
            target_snps = json.load(f)

    generate_fake_23andme_file("demo/large_sample_genome.txt", target_snps)
    print("File generated.", flush=True)

    results = asyncio.run(analyze_person_variants_async("demo/large_sample_genome.txt", target_snps, max_concurrent=10))
    print(f"Raw individual candidate associations: {len(results)}", flush=True)

    strongest_results = keep_strongest_per_snp(results)
    print(f"After keeping strongest per SNP: {len(strongest_results)}", flush=True)

    for r in strongest_results:
        print(r)