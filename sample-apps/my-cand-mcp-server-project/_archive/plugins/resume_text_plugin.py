import os
import re
from typing import List, Dict, Any
from plugins.base import BaseSourcePlugin, RawCandidateField

class ResumeTextPlugin(BaseSourcePlugin):
    def detect(self, source_path: str) -> bool:
        filename = os.path.basename(source_path).lower()
        return filename.endswith('.txt') and ('resume' in filename or 'cv' in filename)

    def extract(self, source_path: str) -> List[RawCandidateField]:
        if not self.detect(source_path):
            return []

        results: List[RawCandidateField] = []
        try:
            mtime = os.path.getmtime(source_path)
            with open(source_path, mode='r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Skipping resume file {source_path}: {e}")
            return []

        record_id = f"{source_path}#default"
        
        # Split into lines
        lines = [line.strip() for line in content.split('\n') if line.strip()]
        if not lines:
            return []

        # 1. First line is usually name in a resume (Tier D, positional guess)
        name_candidate = lines[0]
        # Make sure it doesn't look like a header or label
        if ":" not in name_candidate and len(name_candidate) < 50:
            results.append({
                "raw_key": "first_line_guess",
                "raw_value": name_candidate,
                "target_field": "full_name",
                "evidence_tier": "D",
                "source": source_path,
                "timestamp": mtime,
                "record_id": record_id
            })

        # 2. Extract standard labels using regex (e.g. Email: ..., Phone: ..., Location: ...)
        email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
        
        for line in lines:
            # Check for labeled fields
            if line.lower().startswith("email:"):
                email_val = line[len("email:"):].strip()
                results.append({
                    "raw_key": "Email",
                    "raw_value": email_val,
                    "target_field": "emails",
                    "evidence_tier": "A", # Labeled, direct mapping
                    "source": source_path,
                    "timestamp": mtime,
                    "record_id": record_id
                })
            elif line.lower().startswith("phone:"):
                phone_val = line[len("phone:"):].strip()
                results.append({
                    "raw_key": "Phone",
                    "raw_value": phone_val,
                    "target_field": "phones",
                    "evidence_tier": "A",
                    "source": source_path,
                    "timestamp": mtime,
                    "record_id": record_id
                })
            elif line.lower().startswith("location:"):
                loc_val = line[len("location:"):].strip()
                results.append({
                    "raw_key": "Location",
                    "raw_value": loc_val,
                    "target_field": "location",
                    "evidence_tier": "A",
                    "source": source_path,
                    "timestamp": mtime,
                    "record_id": record_id
                })
            elif line.lower().startswith("skills:"):
                skills_val = line[len("skills:"):].strip()
                results.append({
                    "raw_key": "Skills",
                    "raw_value": skills_val,
                    "target_field": "skills",
                    "evidence_tier": "A",
                    "source": source_path,
                    "timestamp": mtime,
                    "record_id": record_id
                })

        # 3. Fallback: Search for unlabeled email/phone in the text using regex (Tier B)
        # Check if we already have emails; if not, look for unlabeled
        has_emails = any(r['target_field'] == 'emails' for r in results)
        if not has_emails:
            emails_found = re.findall(email_pattern, content)
            for em in emails_found:
                results.append({
                    "raw_key": "unlabeled_regex_email",
                    "raw_value": em,
                    "target_field": "emails",
                    "evidence_tier": "B",
                    "source": source_path,
                    "timestamp": mtime,
                    "record_id": record_id
                })

        has_phones = any(r['target_field'] == 'phones' for r in results)
        if not has_phones:
            # Match formats like 555-0244, (555) 555-5555, +1 555 555 5555, etc.
            phone_pattern = r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{3}-\d{4}\b'
            phones_found = re.findall(phone_pattern, content)
            for ph in phones_found:
                results.append({
                    "raw_key": "unlabeled_regex_phone",
                    "raw_value": ph,
                    "target_field": "phones",
                    "evidence_tier": "B",
                    "source": source_path,
                    "timestamp": mtime,
                    "record_id": record_id
                })

        # 4. Extract years of experience from summary if present
        exp_years_match = re.search(r'(\d+(?:\.\d+)?)\s*years?\s*of\s*experience', content, re.IGNORECASE)
        if exp_years_match:
            try:
                years = float(exp_years_match.group(1))
                results.append({
                    "raw_key": "experience_summary_years",
                    "raw_value": years,
                    "target_field": "years_experience",
                    "evidence_tier": "B", # Regex match on text block
                    "source": source_path,
                    "timestamp": mtime,
                    "record_id": record_id
                })
            except ValueError:
                pass

        # 5. Extract structured Experience section (Tier D)
        # Search for lines between "Experience:" and next section heading (e.g. "Education:")
        exp_section_match = re.search(r'Experience:\s*(.*?)(?=\bEducation:|\bSkills:|$)', content, re.DOTALL | re.IGNORECASE)
        if exp_section_match:
            exp_text = exp_section_match.group(1).strip()
            # Split experience block into records, e.g., splitting by lines that match Title at Company
            # Let's match lines like: "Software Engineer at OldCo (July 2021 - Dec 2023)"
            exp_matches = re.finditer(r'([^\n]+?)\s+at\s+([^\n]+?)\s+\((.+?)\s*-\s*(.+?)\)', exp_text)
            experiences = []
            for m in exp_matches:
                title = m.group(1).strip()
                company = m.group(2).strip()
                start = m.group(3).strip()
                end = m.group(4).strip()
                # Find bullet points right after this line
                desc_lines = []
                # Let's simple capture the rest of the text and check for bullets
                sub_text = exp_text[m.end():]
                next_header = re.search(r'[^\n]+?\s+at\s+[^\n]+?\s+\(', sub_text)
                desc_block = sub_text[:next_header.start()] if next_header else sub_text
                for dl in desc_block.split('\n'):
                    dl_s = dl.strip()
                    if dl_s.startswith('-') or dl_s.startswith('*'):
                        desc_lines.append(dl_s[1:].strip())
                
                experiences.append({
                    "company": company,
                    "title": title,
                    "start_date": start,
                    "end_date": end,
                    "description": "\n".join(desc_lines) if desc_lines else None
                })
            if experiences:
                results.append({
                    "raw_key": "experience_section",
                    "raw_value": experiences,
                    "target_field": "experience",
                    "evidence_tier": "D", # Positional/Contextual guessing
                    "source": source_path,
                    "timestamp": mtime,
                    "record_id": record_id
                })

        # 6. Extract structured Education section (Tier D)
        edu_section_match = re.search(r'Education:\s*(.*?)(?=\bExperience:|\bSkills:|$)', content, re.DOTALL | re.IGNORECASE)
        if edu_section_match:
            edu_text = edu_section_match.group(1).strip()
            # E.g., "B.S. Computer Science - Springfield University (2012 - 2016)"
            edu_matches = re.finditer(r'([^\n-]+?)\s*-\s*([^\n(]+?)\s*\((.+?)\s*-\s*(.+?)\)', edu_text)
            education_list = []
            for m in edu_matches:
                deg_field = m.group(1).strip()
                institution = m.group(2).strip()
                start = m.group(3).strip()
                end = m.group(4).strip()
                
                # Split degree and field if contains "in" or similar
                degree = deg_field
                field_of_study = None
                in_match = re.search(r'\bin\s+(.+)', deg_field, re.IGNORECASE)
                if in_match:
                    field_of_study = in_match.group(1).strip()
                    degree = deg_field[:in_match.start()].strip()

                education_list.append({
                    "institution": institution,
                    "degree": degree,
                    "field_of_study": field_of_study,
                    "start_date": start,
                    "end_date": end
                })
            if education_list:
                results.append({
                    "raw_key": "education_section",
                    "raw_value": education_list,
                    "target_field": "education",
                    "evidence_tier": "D",
                    "source": source_path,
                    "timestamp": mtime,
                    "record_id": record_id
                })

        return results
