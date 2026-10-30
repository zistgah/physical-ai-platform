/** Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. */
/**
 * FILE: site/components/compliance/standards-corpus.js
 * FILE PURPOSE: Standards corpus. Loads the informational corpus, copies required evidence on adoption, and never displays a null field.
 * MRD: see docs/iterations/MRD-TRACEABILITY.md
 */
/**
 * Standards corpus – Iteration 10
 * 164 records from the 2026-10-24 complete corpus.
 * Metadata/provenance only. Not the text of the standards. Not a legal determination.
 * Platform status is INFORMATIONAL until project adoption. editionStatus is publisher status.
 * Source: data/standards/corpus.json plus data/standards/provenance/.
 */

import { displayStandard } from "./standards-display.js";

export const STANDARDS_CORPUS = [
  {
    "id": "std-iso-15288",
    "name": "ISO/IEC/IEEE 15288",
    "title": null,
    "layer": "Global",
    "tier": "Universal SE",
    "topic": "Systems engineering life cycle",
    "domains": [
      "TERRESTRIAL",
      "AERIAL",
      "INDUSTRIAL",
      "AEROSPACE"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Requirements traceability",
      "Verification records",
      "Configuration baseline"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "docs/MRD.md \u00a77",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://www.iso.org/standard/81702.html",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-iso-12207",
    "name": "ISO/IEC/IEEE 12207",
    "title": null,
    "layer": "Global",
    "tier": "Universal SE",
    "topic": "Software life cycle",
    "domains": [
      "TERRESTRIAL",
      "INDUSTRIAL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Software configuration",
      "Verification"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "docs/MRD.md \u00a77",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://www.iso.org/standard/90219.html",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-iso-42010",
    "name": "ISO/IEC/IEEE 42010",
    "title": null,
    "layer": "Global",
    "tier": "Universal SE",
    "topic": "Architecture description",
    "domains": [
      "TERRESTRIAL",
      "AERIAL",
      "INDUSTRIAL",
      "AEROSPACE"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Architecture description",
      "Viewpoint coverage"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "docs/MRD.md \u00a77",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://www.iso.org/standard/74393.html",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-iso-24748",
    "name": "ISO/IEC/IEEE 24748",
    "title": null,
    "layer": "Global",
    "tier": "Universal SE",
    "topic": "Life cycle management guidance",
    "domains": [
      "TERRESTRIAL",
      "INDUSTRIAL",
      "AEROSPACE"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Life cycle plan"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "docs/MRD.md \u00a77",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://www.iso.org/standard/84709.html",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-iso-15939",
    "name": "ISO/IEC/IEEE 15939",
    "title": null,
    "layer": "Global",
    "tier": "Universal SE",
    "topic": "Measurement process",
    "domains": [
      "TERRESTRIAL",
      "INDUSTRIAL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Measurement plan",
      "Measurement results"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "docs/MRD.md \u00a77",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://www.iso.org/standard/71197.html",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-eia-632",
    "name": "EIA-632",
    "title": null,
    "layer": "Global",
    "tier": "Universal SE",
    "topic": "Processes for engineering a system",
    "domains": [
      "TERRESTRIAL",
      "INDUSTRIAL",
      "AEROSPACE"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Process records"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "docs/MRD.md \u00a77",
      "confidence": "PROFILED",
      "accessed_at": null,
      "external_provenance_status": "INTERNAL_SOURCE_ONLY"
    }
  },
  {
    "id": "std-ieee-1012",
    "name": "IEEE 1012",
    "title": null,
    "layer": "Global",
    "tier": "Universal SE",
    "topic": "Verification and validation",
    "domains": [
      "TERRESTRIAL",
      "INDUSTRIAL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "V&V plan",
      "V&V report"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "sources/mrd-predecessor",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://standards.ieee.org/ieee/1012/5681/",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-ieee-1028",
    "name": "IEEE 1028",
    "title": null,
    "layer": "Global",
    "tier": "Universal SE",
    "topic": "Reviews and audits",
    "domains": [
      "TERRESTRIAL",
      "INDUSTRIAL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Review records"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "sources/mrd-predecessor",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://standards.ieee.org/ieee/1028/5680/",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-ieee-828",
    "name": "IEEE 828",
    "title": null,
    "layer": "Global",
    "tier": "Universal SE",
    "topic": "Configuration management",
    "domains": [
      "TERRESTRIAL",
      "INDUSTRIAL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "CM plan",
      "Baseline records"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "sources/mrd-predecessor",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://standards.ieee.org/ieee/828/6708/",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-iso-9001",
    "name": "ISO 9001",
    "title": null,
    "layer": "Global",
    "tier": "Universal SE",
    "topic": "Quality management",
    "domains": [
      "INDUSTRIAL",
      "MANUFACTURING"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Quality plan",
      "Records"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "docs/MRD.md \u00a77",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://www.iso.org/standard/62085.html",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-iso-19011",
    "name": "ISO 19011",
    "title": null,
    "layer": "Global",
    "tier": "Universal SE",
    "topic": "Auditing management systems",
    "domains": [
      "INDUSTRIAL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Audit plan",
      "Audit report"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "sources/mrd-predecessor",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://www.iso.org/standard/84924.html",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-iec-61508",
    "name": "IEC 61508",
    "title": null,
    "layer": "Global",
    "tier": "Technical",
    "topic": "Functional safety",
    "domains": [
      "INDUSTRIAL",
      "TERRESTRIAL"
    ],
    "embodiments": [],
    "riskClass": [
      "HIGH",
      "MEDIUM"
    ],
    "requiredEvidence": [
      "Safety case",
      "Hazard analysis"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "docs/MRD.md \u00a77",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://webstore.iec.ch/en/search?query=61508",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-iso-13849",
    "name": "ISO 13849",
    "title": null,
    "layer": "Global",
    "tier": "Technical",
    "topic": "Safety of machinery",
    "domains": [
      "INDUSTRIAL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Performance level assessment"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "docs/MRD.md \u00a77",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://www.iso.org/standard/73481.html",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-iso-10218",
    "name": "ISO 10218",
    "title": null,
    "layer": "Global",
    "tier": "Technical",
    "topic": "Industrial robots safety",
    "domains": [
      "INDUSTRIAL"
    ],
    "embodiments": [
      "FIXED"
    ],
    "riskClass": [],
    "requiredEvidence": [
      "Risk assessment",
      "Safeguarding"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "sources/mrd-predecessor",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://www.iso.org/sectors/engineering/robotics.html",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-iso-10218-1",
    "name": "ISO 10218-1",
    "title": null,
    "layer": "Global",
    "tier": "Technical",
    "topic": "Industrial robots \u2014 robots",
    "domains": [
      "INDUSTRIAL"
    ],
    "embodiments": [
      "FIXED"
    ],
    "riskClass": [],
    "requiredEvidence": [
      "Robot safety requirements"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "sources/mrd-predecessor",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://www.iso.org/sectors/engineering/robotics.html",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-iso-10218-2",
    "name": "ISO 10218-2",
    "title": null,
    "layer": "Global",
    "tier": "Technical",
    "topic": "Industrial robots \u2014 integration",
    "domains": [
      "INDUSTRIAL"
    ],
    "embodiments": [
      "FIXED"
    ],
    "riskClass": [],
    "requiredEvidence": [
      "Integration safety"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "sources/mrd-predecessor",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://www.iso.org/sectors/engineering/robotics.html",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-iso-13482",
    "name": "ISO 13482",
    "title": null,
    "layer": "Global",
    "tier": "Technical",
    "topic": "Personal care robots",
    "domains": [
      "DOMESTIC",
      "HEALTHCARE"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Safety requirements",
      "Verification"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "docs/MRD.md \u00a77",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://www.iso.org/standard/53820.html",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-iec-62443",
    "name": "IEC 62443",
    "title": null,
    "layer": "Global",
    "tier": "Technical",
    "topic": "Industrial cybersecurity",
    "domains": [
      "INDUSTRIAL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Security case",
      "Zone/conduit"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "docs/MRD.md \u00a77",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://webstore.iec.ch/en/search?query=62443",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-nasa-npr-7120",
    "name": "NASA NPR 7120.5",
    "title": null,
    "layer": "National",
    "tier": "Agency",
    "topic": "Space program and project management",
    "domains": [
      "AEROSPACE",
      "ORBITAL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Project plan",
      "Reviews"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "docs/MRD.md \u00a77",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://nodis3.gsfc.nasa.gov/",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-mil-std-882",
    "name": "MIL-STD-882",
    "title": null,
    "layer": "National",
    "tier": "Agency",
    "topic": "System safety",
    "domains": [
      "DEFENCE"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Hazard tracking",
      "Risk acceptance"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "docs/MRD.md \u00a77",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://quicksearch.dla.mil/",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-mil-std-810",
    "name": "MIL-STD-810",
    "title": null,
    "layer": "National",
    "tier": "Agency",
    "topic": "Environmental engineering",
    "domains": [
      "DEFENCE"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Environmental test plan",
      "Test report"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "docs/MRD.md \u00a77",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://quicksearch.dla.mil/",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-mil-std-461",
    "name": "MIL-STD-461",
    "title": null,
    "layer": "National",
    "tier": "Agency",
    "topic": "EMI/EMC",
    "domains": [
      "DEFENCE"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "EMC test plan",
      "EMC report"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "docs/MRD.md \u00a77",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://quicksearch.dla.mil/",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-mil-std-883",
    "name": "MIL-STD-883",
    "title": null,
    "layer": "National",
    "tier": "Technical",
    "topic": "Microcircuits test methods",
    "domains": [
      "DEFENCE",
      "AEROSPACE"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Test method records"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "sources/mrd-predecessor",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://quicksearch.dla.mil/",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-mil-std-202",
    "name": "MIL-STD-202",
    "title": null,
    "layer": "National",
    "tier": "Technical",
    "topic": "Electronic component test methods",
    "domains": [
      "DEFENCE"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Test method records"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "sources/mrd-predecessor",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://quicksearch.dla.mil/",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-mil-std-961",
    "name": "MIL-STD-961",
    "title": null,
    "layer": "National",
    "tier": "Agency",
    "topic": "Defense specifications",
    "domains": [
      "DEFENCE"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Specification format"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "sources/mrd-predecessor",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://quicksearch.dla.mil/",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-mil-std-963",
    "name": "MIL-STD-963",
    "title": null,
    "layer": "National",
    "tier": "Agency",
    "topic": "Data item descriptions",
    "domains": [
      "DEFENCE"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "DID compliance"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "sources/mrd-predecessor",
      "confidence": "PROFILED",
      "accessed_at": null,
      "official_source_url": "https://quicksearch.dla.mil/",
      "external_provenance_status": "AUTHORITY_URL_ADDED_FOR_REGISTRY_COMPLETENESS"
    }
  },
  {
    "id": "std-isro-profile",
    "name": "ISRO product assurance profile",
    "title": null,
    "layer": "National",
    "tier": "Agency",
    "topic": "ISRO project assurance (profile, not a single numbered standard)",
    "domains": [
      "AEROSPACE",
      "ORBITAL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [
      "Product assurance plan",
      "Configuration records"
    ],
    "recordClass": null,
    "editionStatus": null,
    "status": "INFORMATIONAL",
    "notes": null,
    "provenance": {
      "source": "docs/MRD.md \u00a77",
      "confidence": "PROFILED",
      "note": "Profile of ISRO practice named in corpus; not an official ISRO publication",
      "accessed_at": null,
      "external_provenance_status": "INTERNAL_SOURCE_ONLY"
    }
  },
  {
    "id": "std-iso-21423",
    "name": "ISO 21423:2026",
    "title": "Robotics - Industrial mobile robots - Communications and interoperability",
    "layer": null,
    "tier": null,
    "topic": "Robotics - Industrial mobile robots - Communications and interoperability",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "International Standard",
    "editionStatus": "Published",
    "status": "INFORMATIONAL",
    "notes": "Published 2026-10; current at access. Not safety-related; covers communications/interoperability for industrial mobile robots.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/86749.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official ISO standard record",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/86749.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-19649",
    "name": "ISO 19649:2017",
    "title": "Mobile robots - Vocabulary",
    "layer": null,
    "tier": null,
    "topic": "Mobile robots - Vocabulary",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "International Standard",
    "editionStatus": "Current / confirmed 2022",
    "status": "INFORMATIONAL",
    "notes": "Vocabulary for mobile robots, locomotion and navigation.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/65658.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official ISO standard record",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/65658.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-ts-25213",
    "name": "ISO/TS 25213:2026",
    "title": "Robotics - Test methods for measuring the energy consumption of robots - 6-Axis articulated industrial robots",
    "layer": null,
    "tier": null,
    "topic": "Robotics - Test methods for measuring the energy consumption of robots - 6-Axis articulated industrial robots",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "Technical Specification",
    "editionStatus": "Published",
    "status": "INFORMATIONAL",
    "notes": "Energy-consumption measurement methods for 6-axis articulated industrial robots; excludes service, medical, SCARA, AMR and DELTA robots.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/89447.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official ISO standard record",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/89447.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-3691-4",
    "name": "ISO 3691-4:2023",
    "title": "Industrial trucks - Safety requirements and verification - Part 4: Driverless industrial trucks and their systems",
    "layer": null,
    "tier": null,
    "topic": "Industrial trucks - Safety requirements and verification - Part 4: Driverless industrial trucks and their systems",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "International Standard",
    "editionStatus": "Published; revision under development",
    "status": "INFORMATIONAL",
    "notes": "Covers driverless industrial trucks including AGVs and autonomous mobile robots in industrial environments; ISO/DIS 3691-4 is under development.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/83545.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official ISO standard record",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/83545.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-18646-2",
    "name": "ISO 18646-2:2024",
    "title": "Robotics - Performance criteria and related test methods for service robots - Part 2: Navigation",
    "layer": null,
    "tier": null,
    "topic": "Robotics - Performance criteria and related test methods for service robots - Part 2: Navigation",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "International Standard",
    "editionStatus": "Published",
    "status": "INFORMATIONAL",
    "notes": "Current 2024 edition; replaces withdrawn 2019 edition.",
    "provenance": {
      "source_url": "https://www.iso.org/committee/5915511/x/catalogue/p/0/u/1/w/0/d/0",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official ISO/TC 299 catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/committee/5915511/x/catalogue/p/0/u/1/w/0/d/0",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-18646-3",
    "name": "ISO 18646-3:2021",
    "title": "Robotics - Performance criteria and related test methods for service robots - Part 3: Manipulation",
    "layer": null,
    "tier": null,
    "topic": "Robotics - Performance criteria and related test methods for service robots - Part 3: Manipulation",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "International Standard",
    "editionStatus": "Current catalogue entry",
    "status": "INFORMATIONAL",
    "notes": "Performance criteria and test methods for service-robot manipulation.",
    "provenance": {
      "source_url": "https://www.iso.org/committee/5915511/x/catalogue/p/0/u/1/w/0/d/0",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official ISO/TC 299 catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/committee/5915511/x/catalogue/p/0/u/1/w/0/d/0",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-18646-5",
    "name": "ISO 18646-5:2026",
    "title": "Robotics - Performance criteria and related test methods for service robots - Part 5: Locomotion for legged robots",
    "layer": null,
    "tier": null,
    "topic": "Robotics - Performance criteria and related test methods for service robots - Part 5: Locomotion for legged robots",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "International Standard",
    "editionStatus": "Published / current catalogue entry",
    "status": "INFORMATIONAL",
    "notes": "Legged-robot locomotion performance and test methods.",
    "provenance": {
      "source_url": "https://www.iso.org/committee/5915511/x/catalogue/p/0/u/1/w/0/d/0",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official ISO/TC 299 catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/committee/5915511/x/catalogue/p/0/u/1/w/0/d/0",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-tr-23482-1",
    "name": "ISO/TR 23482-1:2020",
    "title": "Robotics - Application of ISO 13482 - Part 1: Safety-related test methods",
    "layer": null,
    "tier": null,
    "topic": "Robotics - Application of ISO 13482 - Part 1: Safety-related test methods",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "Technical Report",
    "editionStatus": "Published",
    "status": "INFORMATIONAL",
    "notes": "Safety-related test methods for personal care robots under ISO 13482.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/71564.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official ISO standard record",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/71564.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-tr-23482-2",
    "name": "ISO/TR 23482-2:2019",
    "title": "Robotics - Application of ISO 13482 - Part 2: Application guidelines",
    "layer": null,
    "tier": null,
    "topic": "Robotics - Application of ISO 13482 - Part 2: Application guidelines",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "Technical Report",
    "editionStatus": "Published",
    "status": "INFORMATIONAL",
    "notes": "Application guidance for ISO 13482 and risk assessment for service robots.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/71627.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official ISO standard record",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/71627.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-13850",
    "name": "ISO 13850:2015",
    "title": "Safety of machinery - Emergency stop function - Principles for design",
    "layer": null,
    "tier": null,
    "topic": "Safety of machinery - Emergency stop function - Principles for design",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "International Standard",
    "editionStatus": "Current; revision under development",
    "status": "INFORMATIONAL",
    "notes": "Functional requirements and design principles for emergency-stop functions.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/59970.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official ISO standard record",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/59970.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-13849-1",
    "name": "ISO 13849-1:2023",
    "title": "Safety of machinery - Safety-related parts of control systems - Part 1: General principles for design",
    "layer": null,
    "tier": null,
    "topic": "Safety of machinery - Safety-related parts of control systems - Part 1: General principles for design",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "International Standard",
    "editionStatus": "Published",
    "status": "INFORMATIONAL",
    "notes": "Methodology and requirements for safety-related parts of control systems.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/73481.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official ISO standard record",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/73481.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iec-62443-2-4",
    "name": "IEC 62443-2-4:2023",
    "title": "Security for industrial automation and control systems - Part 2-4: Security program requirements for IACS service providers",
    "layer": null,
    "tier": null,
    "topic": "Security for industrial automation and control systems - Part 2-4: Security program requirements for IACS service providers",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "International Standard",
    "editionStatus": "Valid",
    "status": "INFORMATIONAL",
    "notes": "Security-program requirements for IACS service providers; supports contextual profiles.",
    "provenance": {
      "source_url": "https://webstore.iec.ch/en/publication/67631",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official IEC Webstore record",
      "authority": "IEC",
      "source": "https://webstore.iec.ch/en/publication/67631",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iec-62443-3-2",
    "name": "IEC 62443-3-2:2020",
    "title": "Security for industrial automation and control systems - Part 3-2: Security risk assessment for system design",
    "layer": null,
    "tier": null,
    "topic": "Security for industrial automation and control systems - Part 3-2: Security risk assessment for system design",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "International Standard",
    "editionStatus": "Valid",
    "status": "INFORMATIONAL",
    "notes": "Defines system-under-consideration, zones/conduits, risk assessment and target security levels.",
    "provenance": {
      "source_url": "https://webstore.iec.ch/en/publication/30727",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official IEC Webstore record",
      "authority": "IEC",
      "source": "https://webstore.iec.ch/en/publication/30727",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iec-62443-4-2",
    "name": "IEC 62443-4-2:2019",
    "title": "Security for industrial automation and control systems - Part 4-2: Technical security requirements for IACS components",
    "layer": null,
    "tier": null,
    "topic": "Security for industrial automation and control systems - Part 4-2: Technical security requirements for IACS components",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "International Standard",
    "editionStatus": "Valid with 2022 corrigendum incorporated",
    "status": "INFORMATIONAL",
    "notes": "Component-level technical security requirements and capability security levels.",
    "provenance": {
      "source_url": "https://webstore.iec.ch/en/publication/34421",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official IEC Webstore record",
      "authority": "IEC",
      "source": "https://webstore.iec.ch/en/publication/34421",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iec-pas-62443-1-6",
    "name": "IEC PAS 62443-1-6:2025",
    "title": "Security for industrial automation and control systems - Part 1-6: Application of the 62443 series to the Industrial Internet of Things",
    "layer": null,
    "tier": null,
    "topic": "Security for industrial automation and control systems - Part 1-6: Application of the 62443 series to the Industrial Internet of Things",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "Publicly Available Specification",
    "editionStatus": "Published PAS",
    "status": "INFORMATIONAL",
    "notes": "Guidance for applying the 62443 series to IIoT; PAS lifecycle applies.",
    "provenance": {
      "source_url": "https://webstore.iec.ch/en/publication/102885",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official IEC Webstore record",
      "authority": "IEC",
      "source": "https://webstore.iec.ch/en/publication/102885",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iec-pas-62443-2-2",
    "name": "IEC PAS 62443-2-2:2025",
    "title": "Security for industrial automation and control systems - Part 2-2: IACS security protection scheme",
    "layer": null,
    "tier": null,
    "topic": "Security for industrial automation and control systems - Part 2-2: IACS security protection scheme",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "Publicly Available Specification",
    "editionStatus": "Published PAS",
    "status": "INFORMATIONAL",
    "notes": "Security Protection Scheme guidance for IACS asset owners.",
    "provenance": {
      "source_url": "https://webstore.iec.ch/en/publication/63886",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official IEC Webstore record",
      "authority": "IEC",
      "source": "https://webstore.iec.ch/en/publication/63886",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-nasa-npr-7123-1d",
    "name": "NPR 7123.1D",
    "title": "NASA Systems Engineering Processes and Requirements Updated w/Change 2",
    "layer": null,
    "tier": null,
    "topic": "NASA Systems Engineering Processes and Requirements Updated w/Change 2",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "NASA Procedural Requirement",
    "editionStatus": "Effective 2023-07-05 to 2028-07-05",
    "status": "INFORMATIONAL",
    "notes": "NASA systems-engineering processes and requirements; applies across system life cycle.",
    "provenance": {
      "source_url": "https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_7123_001D_",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official NASA NODIS record",
      "authority": "NASA",
      "source": "https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_7123_001D_",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-nasa-npr-7150-2d",
    "name": "NPR 7150.2D",
    "title": "NASA Software Engineering Requirements",
    "layer": null,
    "tier": null,
    "topic": "NASA Software Engineering Requirements",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "NASA Procedural Requirement",
    "editionStatus": "Effective 2022-03-08 to 2027-03-08",
    "status": "INFORMATIONAL",
    "notes": "Software acquisition, development, maintenance, operation, retirement and management requirements.",
    "provenance": {
      "source_url": "https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_7150_002D_",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official NASA NODIS record",
      "authority": "NASA",
      "source": "https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_7150_002D_",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-nasa-npr-8000-4c",
    "name": "NPR 8000.4C",
    "title": "Agency Risk Management Procedural Requirements",
    "layer": null,
    "tier": null,
    "topic": "Agency Risk Management Procedural Requirements",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "NASA Procedural Requirement",
    "editionStatus": "Effective 2022-04-19 to 2027-04-19",
    "status": "INFORMATIONAL",
    "notes": "Risk-informed decision making, continuous risk management and formal risk acceptance.",
    "provenance": {
      "source_url": "https://nodis3.gsfc.nasa.gov/displayDir.cfm?c=8000&s=4C&t=NPR",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official NASA NODIS record",
      "authority": "NASA",
      "source": "https://nodis3.gsfc.nasa.gov/displayDir.cfm?c=8000&s=4C&t=NPR",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-bis-is-iso-10218-p1-2025",
    "name": "IS/ISO 10218 (Part 1):2025",
    "title": "Robotics safety requirements: Part 1 Industrial robots",
    "layer": null,
    "tier": null,
    "topic": "Robotics safety requirements: Part 1 Industrial robots",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "Indian Standard",
    "editionStatus": "Published",
    "status": "INFORMATIONAL",
    "notes": "Indian adoption identical under single numbering; supersedes IS 14530 Part 1:2019.",
    "provenance": {
      "source_url": "https://standards.bis.gov.in/website/standard-details?encryptedId=eyJpdiI6IjR0TzUxQitnT1NzMzhra204cVJ3MHc9PSIsInZhbHVlIjoiTE5sYkN5cUJ3ZmpaVjl4SUpNZVlGZz09IiwibWFjIjoiYTVmNGMwN2I0NTc3N2RlNTFiMTI2MjgzZWE5YTI1ZjI4NDg2ODZhZGY3Nzk4NGMxYTFiMjUyZTgzMmM0ZTZiZCIsInRhZyI6IiJ9",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official BIS standard-details record",
      "authority": "BIS",
      "source": "https://standards.bis.gov.in/website/standard-details?encryptedId=eyJpdiI6IjR0TzUxQitnT1NzMzhra204cVJ3MHc9PSIsInZhbHVlIjoiTE5sYkN5cUJ3ZmpaVjl4SUpNZVlGZz09IiwibWFjIjoiYTVmNGMwN2I0NTc3N2RlNTFiMTI2MjgzZWE5YTI1ZjI4NDg2ODZhZGY3Nzk4NGMxYTFiMjUyZTgzMmM0ZTZiZCIsInRhZyI6IiJ9",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-bis-is-iso-10218-p2-2025",
    "name": "IS/ISO 10218 (Part 2):2025",
    "title": "Robotics safety requirements: Part 2 Industrial robot applications and robot cells",
    "layer": null,
    "tier": null,
    "topic": "Robotics safety requirements: Part 2 Industrial robot applications and robot cells",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "Indian Standard",
    "editionStatus": "Published",
    "status": "INFORMATIONAL",
    "notes": "Indian adoption identical under dual numbering; page also records the current Part 1 adoption.",
    "provenance": {
      "source_url": "https://standards.bis.gov.in/website/standard-details?encryptedId=eyJpdiI6IjVFMU1IdGc1ZWVTbTcwTmhEZEVRTXc9PSIsInZhbHVlIjoiay81U2VUT1Y5ZkhCemsyNnFZVDNUUT09IiwibWFjIjoiNzVkMmYwYmI3MDY1YWMxNzJiYTI4YjgyZjdkNDY5OTc3NmU4YjUxOTJhOWJhZTQ5NWNiOGI4ZGUwNGVlOTA4ZiIsInRhZyI6IiJ9",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official BIS standard-details record",
      "authority": "BIS",
      "source": "https://standards.bis.gov.in/website/standard-details?encryptedId=eyJpdiI6IjVFMU1IdGc1ZWVTbTcwTmhEZEVRTXc9PSIsInZhbHVlIjoiay81U2VUT1Y5ZkhCemsyNnFZVDNUUT09IiwibWFjIjoiNzVkMmYwYmI3MDY1YWMxNzJiYTI4YjgyZjdkNDY5OTc3NmU4YjUxOTJhOWJhZTQ5NWNiOGI4ZGUwNGVlOTA4ZiIsInRhZyI6IiJ9",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-mil-std-882e-change1",
    "name": "MIL-STD-882E w/Change 1",
    "title": "System Safety",
    "layer": null,
    "tier": null,
    "topic": "System Safety",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "Military Standard",
    "editionStatus": "Official DLA record located",
    "status": "INFORMATIONAL",
    "notes": "System safety practice for hazard elimination and risk reduction; DLA record indicates current-source verification requirement.",
    "provenance": {
      "source_url": "https://quicksearch.dla.mil/WMX/Default.aspx?token=5784600",
      "accessed_at": "2026-10-24",
      "provenance_basis": "DLA Quick Search record",
      "authority": "U.S. Department of Defense",
      "source": "https://quicksearch.dla.mil/WMX/Default.aspx?token=5784600",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-mil-std-461g",
    "name": "MIL-STD-461G",
    "title": "Requirements for the Control of Electromagnetic Interference Characteristics of Subsystems and Equipment",
    "layer": null,
    "tier": null,
    "topic": "Requirements for the Control of Electromagnetic Interference Characteristics of Subsystems and Equipment",
    "domains": [],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "Military Standard",
    "editionStatus": "Official DLA record located",
    "status": "INFORMATIONAL",
    "notes": "EMI emission and susceptibility interface/verification requirements for covered military equipment and subsystems.",
    "provenance": {
      "source_url": "https://quicksearch.dla.mil/WMX/Default.aspx?token=5738281",
      "accessed_at": "2026-10-24",
      "provenance_basis": "DLA Quick Search record",
      "authority": "U.S. Department of Defense",
      "source": "https://quicksearch.dla.mil/WMX/Default.aspx?token=5738281",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-15289",
    "name": "ISO/IEC/IEEE 15289:2019",
    "title": "Life-cycle information",
    "layer": null,
    "tier": null,
    "topic": "Life-cycle information",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/74909.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Systems and software engineering - Content of life-cycle information items (documentation)",
      "source": "https://www.iso.org/standard/74909.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-24748-1",
    "name": "ISO/IEC/IEEE 24748-1:2024",
    "title": "Life-cycle management",
    "layer": null,
    "tier": null,
    "topic": "Life-cycle management",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/84709.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Guidelines for life cycle management",
      "source": "https://www.iso.org/standard/84709.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-24748-2",
    "name": "ISO/IEC/IEEE 24748-2:2024",
    "title": "Life-cycle management",
    "layer": null,
    "tier": null,
    "topic": "Life-cycle management",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/84661.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Guidelines for application of ISO/IEC/IEEE 15288",
      "source": "https://www.iso.org/standard/84661.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-24748-3",
    "name": "ISO/IEC/IEEE 24748-3:2020",
    "title": "Life-cycle management",
    "layer": null,
    "tier": null,
    "topic": "Life-cycle management",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/77698.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Guidelines for application of ISO/IEC/IEEE 12207",
      "source": "https://www.iso.org/standard/77698.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-24748-4",
    "name": "ISO/IEC/IEEE 24748-4:2026",
    "title": "Life-cycle management",
    "layer": null,
    "tier": null,
    "topic": "Life-cycle management",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/87797.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Systems engineering management planning",
      "source": "https://www.iso.org/standard/87797.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-24748-5",
    "name": "ISO/IEC/IEEE 24748-5:2017",
    "title": "Life-cycle management",
    "layer": null,
    "tier": null,
    "topic": "Life-cycle management",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/60062.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Software development planning",
      "source": "https://www.iso.org/standard/60062.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-24748-7",
    "name": "ISO/IEC/IEEE 24748-7:2026",
    "title": "Defence systems engineering",
    "layer": null,
    "tier": null,
    "topic": "Defence systems engineering",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/90139.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Application of systems engineering on defence programs",
      "source": "https://www.iso.org/standard/90139.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-24748-8",
    "name": "ISO/IEC/IEEE 24748-8:2026",
    "title": "Defence reviews",
    "layer": null,
    "tier": null,
    "topic": "Defence reviews",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/91563.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Technical reviews and audits on defence programs",
      "source": "https://www.iso.org/standard/91563.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-24748-10",
    "name": "ISO/IEC/IEEE 24748-10:2026",
    "title": "Life-cycle management",
    "layer": null,
    "tier": null,
    "topic": "Life-cycle management",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/90086.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Guidelines for systems engineering agility",
      "source": "https://www.iso.org/standard/90086.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-29148",
    "name": "ISO/IEC/IEEE 29148:2018",
    "title": "Requirements engineering",
    "layer": null,
    "tier": null,
    "topic": "Requirements engineering",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://committee.iso.org/standard/72089.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Life cycle processes - Requirements engineering",
      "source": "https://committee.iso.org/standard/72089.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-16085",
    "name": "ISO/IEC/IEEE 16085:2021",
    "title": "Risk management",
    "layer": null,
    "tier": null,
    "topic": "Risk management",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/74371.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Life cycle processes - Risk management",
      "source": "https://www.iso.org/standard/74371.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-25010",
    "name": "ISO/IEC 25010:2023",
    "title": "Quality model",
    "layer": null,
    "tier": null,
    "topic": "Quality model",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/78176.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Systems and software product quality model",
      "source": "https://www.iso.org/standard/78176.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-25002",
    "name": "ISO/IEC 25002:2024",
    "title": "Quality model",
    "layer": null,
    "tier": null,
    "topic": "Quality model",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/78175.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Quality model overview and usage",
      "source": "https://www.iso.org/standard/78175.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-21839",
    "name": "ISO/IEC/IEEE 21839",
    "title": "Systems of systems",
    "layer": null,
    "tier": null,
    "topic": "Systems of systems",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/91120.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "System of systems considerations in life cycle stages",
      "source": "https://www.iso.org/standard/91120.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-21840",
    "name": "ISO/IEC/IEEE 21840",
    "title": "Systems of systems",
    "layer": null,
    "tier": null,
    "topic": "Systems of systems",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/92475.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Guidelines for utilization of 15288 in systems of systems",
      "source": "https://www.iso.org/standard/92475.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-21841",
    "name": "ISO/IEC/IEEE 21841:2019",
    "title": "Systems of systems",
    "layer": null,
    "tier": null,
    "topic": "Systems of systems",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/71957.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Taxonomy of systems of systems",
      "source": "https://www.iso.org/standard/71957.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-24765",
    "name": "ISO/IEC/IEEE 24765",
    "title": "Terminology",
    "layer": null,
    "tier": null,
    "topic": "Terminology",
    "domains": [
      "ALL"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/85596.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Systems and software engineering vocabulary",
      "source": "https://www.iso.org/standard/85596.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-bpmn",
    "name": "BPMN 2.0.2",
    "title": "Business Process Model and Notation",
    "layer": null,
    "tier": null,
    "topic": "Business Process Model and Notation",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.omg.org/spec/BPMN/2.0.2/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "OMG",
      "source": "https://www.omg.org/spec/BPMN/2.0.2/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-cmmn",
    "name": "CMMN 1.1",
    "title": "Case Management Model and Notation",
    "layer": null,
    "tier": null,
    "topic": "Case Management Model and Notation",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.omg.org/cmmn/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "OMG",
      "source": "https://www.omg.org/cmmn/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-dmn",
    "name": "DMN 1.6",
    "title": "Decision Model and Notation",
    "layer": null,
    "tier": null,
    "topic": "Decision Model and Notation",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.omg.org/dmn/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "OMG",
      "source": "https://www.omg.org/dmn/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-uaf",
    "name": "UAF 1.3",
    "title": "Unified Architecture Framework",
    "layer": null,
    "tier": null,
    "topic": "Unified Architecture Framework",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.omg.org/spec/UAF/1.3",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "OMG",
      "source": "https://www.omg.org/spec/UAF/1.3",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-sbvr",
    "name": "SBVR 1.5",
    "title": "Semantics of Business Vocabulary and Business Rules",
    "layer": null,
    "tier": null,
    "topic": "Semantics of Business Vocabulary and Business Rules",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.omg.org/spec/SBVR/1.5/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "OMG",
      "source": "https://www.omg.org/spec/SBVR/1.5/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-bacm",
    "name": "BACM 1.0",
    "title": "Business Architecture Core Metamodel",
    "layer": null,
    "tier": null,
    "topic": "Business Architecture Core Metamodel",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.omg.org/spec/BACM/1.0/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "OMG",
      "source": "https://www.omg.org/spec/BACM/1.0/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-vdml",
    "name": "VDML 1.1",
    "title": "Value Delivery Modeling Language",
    "layer": null,
    "tier": null,
    "topic": "Value Delivery Modeling Language",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.omg.org/spec/VDML/1.1/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "OMG",
      "source": "https://www.omg.org/spec/VDML/1.1/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-ppm",
    "name": "PPMN 1.0",
    "title": "Pedigree and Provenance Model and Notation",
    "layer": null,
    "tier": null,
    "topic": "Pedigree and Provenance Model and Notation",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.omg.org/spec/PPMN/1.0/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "OMG",
      "source": "https://www.omg.org/spec/PPMN/1.0/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-togaf",
    "name": "TOGAF Standard",
    "title": "The TOGAF Standard",
    "layer": null,
    "tier": null,
    "topic": "The TOGAF Standard",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://publications.opengroup.org/standards/togaf",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "The Open Group",
      "source": "https://publications.opengroup.org/standards/togaf",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-archimate",
    "name": "ArchiMate 3.2",
    "title": "ArchiMate Specification",
    "layer": null,
    "tier": null,
    "topic": "ArchiMate Specification",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.opengroup.org/archimate",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "The Open Group",
      "source": "https://www.opengroup.org/archimate",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-it4it",
    "name": "IT4IT Reference Architecture",
    "title": "IT4IT Reference Architecture",
    "layer": null,
    "tier": null,
    "topic": "IT4IT Reference Architecture",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.opengroup.org/it4it",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "The Open Group",
      "source": "https://www.opengroup.org/it4it",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-open-fair",
    "name": "Open FAIR",
    "title": "Open FAIR Body of Knowledge",
    "layer": null,
    "tier": null,
    "topic": "Open FAIR Body of Knowledge",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.opengroup.org/openfair",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "The Open Group",
      "source": "https://www.opengroup.org/openfair",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-rdf",
    "name": "RDF 1.2",
    "title": "Resource Description Framework",
    "layer": null,
    "tier": null,
    "topic": "Resource Description Framework",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.w3.org/TR/rdf12-concepts/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "W3C",
      "source": "https://www.w3.org/TR/rdf12-concepts/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-rdfs",
    "name": "RDF Schema 1.2",
    "title": "RDF Schema",
    "layer": null,
    "tier": null,
    "topic": "RDF Schema",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.w3.org/TR/rdf12-schema/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "W3C",
      "source": "https://www.w3.org/TR/rdf12-schema/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-owl2",
    "name": "OWL 2",
    "title": "Web Ontology Language",
    "layer": null,
    "tier": null,
    "topic": "Web Ontology Language",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.w3.org/TR/owl2-overview/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "W3C",
      "source": "https://www.w3.org/TR/owl2-overview/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-skos",
    "name": "SKOS",
    "title": "Simple Knowledge Organization System",
    "layer": null,
    "tier": null,
    "topic": "Simple Knowledge Organization System",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.w3.org/TR/skos-reference/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "W3C",
      "source": "https://www.w3.org/TR/skos-reference/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-shacl",
    "name": "SHACL 1.2",
    "title": "Shapes Constraint Language",
    "layer": null,
    "tier": null,
    "topic": "Shapes Constraint Language",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.w3.org/TR/shacl12-core/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "W3C",
      "source": "https://www.w3.org/TR/shacl12-core/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-sparql",
    "name": "SPARQL 1.2",
    "title": "SPARQL Query Language",
    "layer": null,
    "tier": null,
    "topic": "SPARQL Query Language",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.w3.org/TR/sparql12-query/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "W3C",
      "source": "https://www.w3.org/TR/sparql12-query/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-jsonld",
    "name": "JSON-LD 1.1",
    "title": "JSON-LD",
    "layer": null,
    "tier": null,
    "topic": "JSON-LD",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.w3.org/TR/json-ld11/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "W3C",
      "source": "https://www.w3.org/TR/json-ld11/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-prov-o",
    "name": "PROV-O",
    "title": "PROV Ontology",
    "layer": null,
    "tier": null,
    "topic": "PROV Ontology",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.w3.org/TR/prov-o/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "W3C",
      "source": "https://www.w3.org/TR/prov-o/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso11179",
    "name": "ISO/IEC 11179-1:2023",
    "title": "Metadata registries - Framework",
    "layer": null,
    "tier": null,
    "topic": "Metadata registries - Framework",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/78914.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO/IEC",
      "source": "https://www.iso.org/standard/78914.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso15489",
    "name": "ISO 15489-1:2016",
    "title": "Records management - Concepts and principles",
    "layer": null,
    "tier": null,
    "topic": "Records management - Concepts and principles",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/62542.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/62542.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso30300",
    "name": "ISO 30300:2020",
    "title": "Records management - Core concepts and vocabulary",
    "layer": null,
    "tier": null,
    "topic": "Records management - Core concepts and vocabulary",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/74291.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/74291.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso30301",
    "name": "ISO 30301:2019",
    "title": "Management systems for records - Requirements",
    "layer": null,
    "tier": null,
    "topic": "Management systems for records - Requirements",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/74292.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/74292.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso30302",
    "name": "ISO 30302:2022",
    "title": "Management systems for records - Implementation guidance",
    "layer": null,
    "tier": null,
    "topic": "Management systems for records - Implementation guidance",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/81595.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/81595.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-oais",
    "name": "CCSDS 650.0-M-3",
    "title": "Reference Model for an Open Archival Information System",
    "layer": null,
    "tier": null,
    "topic": "Reference Model for an Open Archival Information System",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://ccsds.org/Pubs/650x0m3.pdf",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "CCSDS",
      "source": "https://ccsds.org/Pubs/650x0m3.pdf",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-premis",
    "name": "PREMIS",
    "title": "Preservation Metadata: Implementation Strategies",
    "layer": null,
    "tier": null,
    "topic": "Preservation Metadata: Implementation Strategies",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.loc.gov/standards/premis/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Library of Congress",
      "source": "https://www.loc.gov/standards/premis/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-mets",
    "name": "METS",
    "title": "Metadata Encoding and Transmission Standard",
    "layer": null,
    "tier": null,
    "topic": "Metadata Encoding and Transmission Standard",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.loc.gov/standards/mets/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Library of Congress",
      "source": "https://www.loc.gov/standards/mets/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-bagit",
    "name": "BagIt",
    "title": "BagIt File Packaging Format",
    "layer": null,
    "tier": null,
    "topic": "BagIt File Packaging Format",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.rfc-editor.org/rfc/rfc8493",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "IETF",
      "source": "https://www.rfc-editor.org/rfc/rfc8493",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-warc",
    "name": "ISO 28500",
    "title": "WARC file format",
    "layer": null,
    "tier": null,
    "topic": "WARC file format",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/68004.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/68004.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-pdfa",
    "name": "ISO 19005",
    "title": "Document management - Electronic document file format for long-term preservation (PDF/A)",
    "layer": null,
    "tier": null,
    "topic": "Document management - Electronic document file format for long-term preservation (PDF/A)",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/38920.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/38920.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-bpm-wp",
    "name": "Workflow Patterns",
    "title": "Workflow Patterns",
    "layer": null,
    "tier": null,
    "topic": "Workflow Patterns",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.workflowpatterns.com/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Workflow Patterns Initiative",
      "source": "https://www.workflowpatterns.com/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso27001",
    "name": "ISO/IEC 27001:2022",
    "title": "Information security management systems - Requirements",
    "layer": null,
    "tier": null,
    "topic": "Information security management systems - Requirements",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/27001.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO/IEC",
      "source": "https://www.iso.org/standard/27001.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso27002",
    "name": "ISO/IEC 27002:2022",
    "title": "Information security controls",
    "layer": null,
    "tier": null,
    "topic": "Information security controls",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/75652.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO/IEC",
      "source": "https://www.iso.org/standard/75652.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso27005",
    "name": "ISO/IEC 27005:2022",
    "title": "Information security risk management",
    "layer": null,
    "tier": null,
    "topic": "Information security risk management",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/80585.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO/IEC",
      "source": "https://www.iso.org/standard/80585.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso15408",
    "name": "ISO/IEC 15408-1:2026",
    "title": "Evaluation criteria for IT security - General model",
    "layer": null,
    "tier": null,
    "topic": "Evaluation criteria for IT security - General model",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/15408-1",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO/IEC",
      "source": "https://www.iso.org/standard/15408-1",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso18045",
    "name": "ISO/IEC 18045:2026",
    "title": "Requirements and methodology for IT security evaluation",
    "layer": null,
    "tier": null,
    "topic": "Requirements and methodology for IT security evaluation",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/18045",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO/IEC",
      "source": "https://www.iso.org/standard/18045",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso29100",
    "name": "ISO/IEC 29100:2024",
    "title": "Privacy framework",
    "layer": null,
    "tier": null,
    "topic": "Privacy framework",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/85938.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO/IEC",
      "source": "https://www.iso.org/standard/85938.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-nist-csf",
    "name": "NIST CSF 2.0",
    "title": "Cybersecurity Framework",
    "layer": null,
    "tier": null,
    "topic": "Cybersecurity Framework",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.nist.gov/cyberframework",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "NIST",
      "source": "https://www.nist.gov/cyberframework",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-nist-800-53",
    "name": "NIST SP 800-53 Rev. 5.2.0",
    "title": "Security and Privacy Controls",
    "layer": null,
    "tier": null,
    "topic": "Security and Privacy Controls",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "NIST",
      "source": "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-nist-ai-rmf",
    "name": "NIST AI RMF 1.0",
    "title": "AI Risk Management Framework",
    "layer": null,
    "tier": null,
    "topic": "AI Risk Management Framework",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.nist.gov/itl/ai-risk-management-framework",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "NIST",
      "source": "https://www.nist.gov/itl/ai-risk-management-framework",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso42001",
    "name": "ISO/IEC 42001:2023",
    "title": "Artificial intelligence - Management system",
    "layer": null,
    "tier": null,
    "topic": "Artificial intelligence - Management system",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/81230.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO/IEC",
      "source": "https://www.iso.org/standard/81230.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso42005",
    "name": "ISO/IEC 42005:2025",
    "title": "AI system impact assessment",
    "layer": null,
    "tier": null,
    "topic": "AI system impact assessment",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/42005",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO/IEC",
      "source": "https://www.iso.org/standard/42005",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso42006",
    "name": "ISO/IEC 42006:2025",
    "title": "Requirements for bodies providing audit and certification of AIMS",
    "layer": null,
    "tier": null,
    "topic": "Requirements for bodies providing audit and certification of AIMS",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/42006",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO/IEC",
      "source": "https://www.iso.org/standard/42006",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso22989",
    "name": "ISO/IEC 22989:2022",
    "title": "Artificial intelligence concepts and terminology",
    "layer": null,
    "tier": null,
    "topic": "Artificial intelligence concepts and terminology",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/74296.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO/IEC",
      "source": "https://www.iso.org/standard/74296.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso23053",
    "name": "ISO/IEC 23053:2022",
    "title": "Framework for AI systems using machine learning",
    "layer": null,
    "tier": null,
    "topic": "Framework for AI systems using machine learning",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/74438.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO/IEC",
      "source": "https://www.iso.org/standard/74438.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso23894",
    "name": "ISO/IEC 23894:2023",
    "title": "Guidance on risk management for AI",
    "layer": null,
    "tier": null,
    "topic": "Guidance on risk management for AI",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/77304.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO/IEC",
      "source": "https://www.iso.org/standard/77304.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-spdx",
    "name": "SPDX Specification",
    "title": "Software Package Data Exchange",
    "layer": null,
    "tier": null,
    "topic": "Software Package Data Exchange",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://spdx.dev/specifications/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "SPDX",
      "source": "https://spdx.dev/specifications/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-cyclonedx",
    "name": "CycloneDX",
    "title": "Bill of Materials specification",
    "layer": null,
    "tier": null,
    "topic": "Bill of Materials specification",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://cyclonedx.org/specification/overview/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "OWASP",
      "source": "https://cyclonedx.org/specification/overview/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-slsa",
    "name": "SLSA",
    "title": "Supply-chain Levels for Software Artifacts",
    "layer": null,
    "tier": null,
    "topic": "Supply-chain Levels for Software Artifacts",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://slsa.dev/spec/v1.2/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "OpenSSF",
      "source": "https://slsa.dev/spec/v1.2/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-in-toto",
    "name": "in-toto",
    "title": "Software supply-chain integrity specification",
    "layer": null,
    "tier": null,
    "topic": "Software supply-chain integrity specification",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://in-toto.io/docs/specs/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "in-toto",
      "source": "https://in-toto.io/docs/specs/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-openapi",
    "name": "OpenAPI Specification",
    "title": "HTTP API interface description",
    "layer": null,
    "tier": null,
    "topic": "HTTP API interface description",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://spec.openapis.org/oas/v3.2.1.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "OpenAPI Initiative",
      "source": "https://spec.openapis.org/oas/v3.2.1.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-asyncapi",
    "name": "AsyncAPI Specification",
    "title": "Event-driven API description",
    "layer": null,
    "tier": null,
    "topic": "Event-driven API description",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.asyncapi.com/docs/reference/specification/v3.0.0",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "AsyncAPI Initiative",
      "source": "https://www.asyncapi.com/docs/reference/specification/v3.0.0",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-ro-crate",
    "name": "RO-Crate",
    "title": "Research Object Crate",
    "layer": null,
    "tier": null,
    "topic": "Research Object Crate",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.researchobject.org/ro-crate/specification.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "researchobject.org",
      "source": "https://www.researchobject.org/ro-crate/specification.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-jats",
    "name": "ANSI/NISO Z39.96-2024",
    "title": "Journal Article Tag Suite",
    "layer": null,
    "tier": null,
    "topic": "Journal Article Tag Suite",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.niso.org/standards-committees/jats",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "NISO",
      "source": "https://www.niso.org/standards-committees/jats",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-cff",
    "name": "Citation File Format",
    "title": "Citation File Format",
    "layer": null,
    "tier": null,
    "topic": "Citation File Format",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://github.com/citation-file-format/citation-file-format",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Citation File Format",
      "source": "https://github.com/citation-file-format/citation-file-format",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-fair",
    "name": "FAIR Principles",
    "title": "FAIR data principles",
    "layer": null,
    "tier": null,
    "topic": "FAIR data principles",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.go-fair.org/fair-principles/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "GO FAIR / FORCE11",
      "source": "https://www.go-fair.org/fair-principles/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-datacite",
    "name": "DataCite Metadata Schema",
    "title": "DataCite metadata schema",
    "layer": null,
    "tier": null,
    "topic": "DataCite metadata schema",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://schema.datacite.org/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "DataCite",
      "source": "https://schema.datacite.org/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-crossref",
    "name": "Crossref Metadata Deposit Schema",
    "title": "Crossref metadata deposit schema",
    "layer": null,
    "tier": null,
    "topic": "Crossref metadata deposit schema",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.crossref.org/documentation/schema-library/metadata-deposit-schema/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Crossref",
      "source": "https://www.crossref.org/documentation/schema-library/metadata-deposit-schema/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-orcid",
    "name": "ORCID iD",
    "title": "ORCID persistent researcher identifier",
    "layer": null,
    "tier": null,
    "topic": "ORCID persistent researcher identifier",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://orcid.org/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ORCID",
      "source": "https://orcid.org/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-ror",
    "name": "ROR",
    "title": "Research Organization Registry",
    "layer": null,
    "tier": null,
    "topic": "Research Organization Registry",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://ror.org/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ROR",
      "source": "https://ror.org/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-doi",
    "name": "DOI",
    "title": "Digital Object Identifier",
    "layer": null,
    "tier": null,
    "topic": "Digital Object Identifier",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.doi.org/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO/Centre?",
      "source": "https://www.doi.org/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-gs1",
    "name": "GS1 standards",
    "title": "Global identification and data standards",
    "layer": null,
    "tier": null,
    "topic": "Global identification and data standards",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.gs1.org/standards",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "GS1",
      "source": "https://www.gs1.org/standards",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-9001-2026",
    "name": "ISO 9001:2026",
    "title": "Quality management systems - Requirements",
    "layer": null,
    "tier": null,
    "topic": "Quality management systems - Requirements",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Current 2026 edition identified by ISO. Existing profile std-iso-9001 is retained for backward compatibility.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/62085.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official ISO standard record / ISO popular standards catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/62085.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso19011-2026",
    "name": "ISO 19011:2026",
    "title": "Guidelines for auditing management systems",
    "layer": null,
    "tier": null,
    "topic": "Guidelines for auditing management systems",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/84924.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/84924.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso17025",
    "name": "ISO/IEC 17025:2017",
    "title": "Competence of testing and calibration laboratories",
    "layer": null,
    "tier": null,
    "topic": "Competence of testing and calibration laboratories",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/66912.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO/IEC",
      "source": "https://www.iso.org/standard/66912.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso13485",
    "name": "ISO 13485:2016",
    "title": "Medical devices - Quality management systems",
    "layer": null,
    "tier": null,
    "topic": "Medical devices - Quality management systems",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/59752.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/59752.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso14971",
    "name": "ISO 14971:2019",
    "title": "Medical devices - Risk management",
    "layer": null,
    "tier": null,
    "topic": "Medical devices - Risk management",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/72704.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/72704.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso26262",
    "name": "ISO 26262:2018",
    "title": "Road vehicles - Functional safety",
    "layer": null,
    "tier": null,
    "topic": "Road vehicles - Functional safety",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/publication/PUB200262.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/publication/PUB200262.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso18497-1",
    "name": "ISO 18497-1:2024",
    "title": "Safety of partially automated, semi-autonomous and autonomous machinery - Design principles and vocabulary",
    "layer": null,
    "tier": null,
    "topic": "Safety of partially automated, semi-autonomous and autonomous machinery - Design principles and vocabulary",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/82684.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/82684.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso18497-2",
    "name": "ISO 18497-2:2024",
    "title": "Obstacle protection systems",
    "layer": null,
    "tier": null,
    "topic": "Obstacle protection systems",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/82686.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/82686.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso18497-3",
    "name": "ISO 18497-3:2024",
    "title": "Autonomous operating zones",
    "layer": null,
    "tier": null,
    "topic": "Autonomous operating zones",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/82687.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/82687.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso18497-4",
    "name": "ISO 18497-4:2024",
    "title": "Verification methods and validation principles",
    "layer": null,
    "tier": null,
    "topic": "Verification methods and validation principles",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/82688.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/82688.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso45001",
    "name": "ISO 45001:2018",
    "title": "Occupational health and safety management systems",
    "layer": null,
    "tier": null,
    "topic": "Occupational health and safety management systems",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/63787.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/63787.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso14001",
    "name": "ISO 14001:2026",
    "title": "Environmental management systems",
    "layer": null,
    "tier": null,
    "topic": "Environmental management systems",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/14001.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/14001.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso50001",
    "name": "ISO 50001:2018",
    "title": "Energy management systems",
    "layer": null,
    "tier": null,
    "topic": "Energy management systems",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/69426.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/69426.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso31101",
    "name": "ISO 31101:2023",
    "title": "Application services provided by service robots - Safety management systems requirements",
    "layer": null,
    "tier": null,
    "topic": "Application services provided by service robots - Safety management systems requirements",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/81172.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/81172.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-j3016",
    "name": "SAE J3016",
    "title": "Taxonomy and definitions for terms related to driving automation systems",
    "layer": null,
    "tier": null,
    "topic": "Taxonomy and definitions for terms related to driving automation systems",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.sae.org/standards/content/j3016_202104/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "SAE",
      "source": "https://www.sae.org/standards/content/j3016_202104/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-imo-solas",
    "name": "SOLAS 1974",
    "title": "International Convention for the Safety of Life at Sea",
    "layer": null,
    "tier": null,
    "topic": "International Convention for the Safety of Life at Sea",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.imo.org/en/about/conventions/pages/international-convention-for-the-safety-of-life-at-sea-(solas),-1974.aspx",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "IMO",
      "source": "https://www.imo.org/en/about/conventions/pages/international-convention-for-the-safety-of-life-at-sea-(solas),-1974.aspx",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-imo-marpol",
    "name": "MARPOL",
    "title": "International Convention for the Prevention of Pollution from Ships",
    "layer": null,
    "tier": null,
    "topic": "International Convention for the Prevention of Pollution from Ships",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.imo.org/en/about/conventions/pages/international-convention-for-the-prevention-of-pollution-from-ships-(marpol).aspx",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "IMO",
      "source": "https://www.imo.org/en/about/conventions/pages/international-convention-for-the-prevention-of-pollution-from-ships-(marpol).aspx",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-imo-ism",
    "name": "ISM Code",
    "title": "International Safety Management Code",
    "layer": null,
    "tier": null,
    "topic": "International Safety Management Code",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.imo.org/en/ourwork/humanelement/pages/ismcode.aspx",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "IMO",
      "source": "https://www.imo.org/en/ourwork/humanelement/pages/ismcode.aspx",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-icao-sarps",
    "name": "ICAO SARPs",
    "title": "Standards and Recommended Practices",
    "layer": null,
    "tier": null,
    "topic": "Standards and Recommended Practices",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.icao.int/safety-management/standards-and-recommended-practices-sarps",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ICAO",
      "source": "https://www.icao.int/safety-management/standards-and-recommended-practices-sarps",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-modaf",
    "name": "MODAF",
    "title": "Ministry of Defence Architecture Framework",
    "layer": null,
    "tier": null,
    "topic": "Ministry of Defence Architecture Framework",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.gov.uk/government/publications/modaf-architecture-framework",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "UK MOD",
      "source": "https://www.gov.uk/government/publications/modaf-architecture-framework",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-naf",
    "name": "NATO Architecture Framework",
    "title": "NATO Architecture Framework",
    "layer": null,
    "tier": null,
    "topic": "NATO Architecture Framework",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.nato.int/cps/en/natohq/topics_157575.htm",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "NATO",
      "source": "https://www.nato.int/cps/en/natohq/topics_157575.htm",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-zachman",
    "name": "Zachman Framework",
    "title": "Zachman Framework for Enterprise Architecture",
    "layer": null,
    "tier": null,
    "topic": "Zachman Framework for Enterprise Architecture",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.zachman.com/about-the-zachman-framework",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Zachman International",
      "source": "https://www.zachman.com/about-the-zachman-framework",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-rm-odp",
    "name": "ISO/IEC 10746 (RM-ODP)",
    "title": "Reference Model of Open Distributed Processing",
    "layer": null,
    "tier": null,
    "topic": "Reference Model of Open Distributed Processing",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/20696.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISO/IEC",
      "source": "https://www.iso.org/standard/20696.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-rami40",
    "name": "RAMI 4.0",
    "title": "Reference Architectural Model Industrie 4.0",
    "layer": null,
    "tier": null,
    "topic": "Reference Architectural Model Industrie 4.0",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.plattform-i40.de/IP/Navigation/EN/Industrie40/Reference-Architecture-Model-Industrie40/reference-architecture-model-industrie40.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "Plattform Industrie 4.0",
      "source": "https://www.plattform-i40.de/IP/Navigation/EN/Industrie40/Reference-Architecture-Model-Industrie40/reference-architecture-model-industrie40.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-sgam",
    "name": "SGAM",
    "title": "Smart Grid Architecture Model",
    "layer": null,
    "tier": null,
    "topic": "Smart Grid Architecture Model",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.entsoe.eu/technopedia/technology/smart-grid-architecture-model/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "CEN-CENELEC-ETSI",
      "source": "https://www.entsoe.eu/technopedia/technology/smart-grid-architecture-model/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-dublincore",
    "name": "Dublin Core",
    "title": "Dublin Core Metadata Element Set",
    "layer": null,
    "tier": null,
    "topic": "Dublin Core Metadata Element Set",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.dublincore.org/specifications/dublin-core/dces/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "DCMI",
      "source": "https://www.dublincore.org/specifications/dublin-core/dces/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-isni",
    "name": "ISNI",
    "title": "International Standard Name Identifier",
    "layer": null,
    "tier": null,
    "topic": "International Standard Name Identifier",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://isni.org/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ISNI International Agency",
      "source": "https://isni.org/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-oidc",
    "name": "OpenID Connect",
    "title": "OpenID Connect Core",
    "layer": null,
    "tier": null,
    "topic": "OpenID Connect Core",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://openid.net/specs/openid-connect-core-1_0.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "OpenID Foundation",
      "source": "https://openid.net/specs/openid-connect-core-1_0.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-oauth",
    "name": "OAuth 2.0",
    "title": "OAuth 2.0 Authorization Framework",
    "layer": null,
    "tier": null,
    "topic": "OAuth 2.0 Authorization Framework",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.rfc-editor.org/rfc/rfc6749",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "IETF",
      "source": "https://www.rfc-editor.org/rfc/rfc6749",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-saml",
    "name": "SAML 2.0",
    "title": "Security Assertion Markup Language",
    "layer": null,
    "tier": null,
    "topic": "Security Assertion Markup Language",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.oasis-open.org/standard/saml/",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "OASIS",
      "source": "https://www.oasis-open.org/standard/saml/",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-scim",
    "name": "SCIM 2.0",
    "title": "System for Cross-domain Identity Management",
    "layer": null,
    "tier": null,
    "topic": "System for Cross-domain Identity Management",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.rfc-editor.org/rfc/rfc7644",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "IETF",
      "source": "https://www.rfc-editor.org/rfc/rfc7644",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-x509",
    "name": "X.509",
    "title": "Information technology - Open Systems Interconnection - Directory - Public-key and attribute certificate frameworks",
    "layer": null,
    "tier": null,
    "topic": "Information technology - Open Systems Interconnection - Directory - Public-key and attribute certificate frameworks",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "SPECIFICATION_OR_FRAMEWORK",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Architecture-named or architecture-supporting record.",
    "provenance": {
      "source_url": "https://www.itu.int/rec/T-REC-X.509",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official authority record/catalogue",
      "authority": "ITU-T",
      "source": "https://www.itu.int/rec/T-REC-X.509",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-12207-2026",
    "name": "ISO/IEC/IEEE 12207:2026",
    "title": "Systems and software engineering - Software life cycle processes",
    "layer": null,
    "tier": null,
    "topic": "Systems and software engineering - Software life cycle processes",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Current edition. Supersedes ISO/IEC/IEEE 12207:2017, which is withdrawn.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/90219.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official ISO standard record",
      "authority": "ISO/IEC/IEEE",
      "source": "https://www.iso.org/standard/90219.html",
      "confidence": "PROFILED"
    }
  },
  {
    "id": "std-iso-19011-2026",
    "name": "ISO 19011:2026",
    "title": "Guidelines for auditing management systems",
    "layer": null,
    "tier": null,
    "topic": "Guidelines for auditing management systems",
    "domains": [
      "CROSS_DOMAIN"
    ],
    "embodiments": [],
    "riskClass": [],
    "requiredEvidence": [],
    "recordClass": "STANDARD",
    "editionStatus": "CURRENT",
    "status": "INFORMATIONAL",
    "notes": "Current edition identified in the architecture predecessor and ISO catalogue.",
    "provenance": {
      "source_url": "https://www.iso.org/standard/84924.html",
      "accessed_at": "2026-10-24",
      "provenance_basis": "Official ISO standard record",
      "authority": "ISO",
      "source": "https://www.iso.org/standard/84924.html",
      "confidence": "PROFILED"
    }
  }
];

export class StandardsCorpusEngine {
  /** constructor: Creates the instance and binds the kernel or options it needs. */
  constructor(kernel) { this.kernel = kernel; }

  /** query: Performs query for this module. */
  query({ domain, embodiment, riskClass, layer, tier, topic } = {}) {
    const legalStatus = "NOT_A_DETERMINATION";
    return STANDARDS_CORPUS.filter(s => {
      if (domain && s.domains.length && !s.domains.includes(domain)) return false;
      if (embodiment && s.embodiments.length && !s.embodiments.includes(embodiment)) return false;
      if (riskClass && s.riskClass.length && !s.riskClass.includes(riskClass)) return false;
      if (layer && s.layer && s.layer !== layer) return false;
      if (tier && s.tier && s.tier !== tier) return false;
      if (topic && !(s.topic || "").toLowerCase().includes(String(topic).toLowerCase())) return false;
      return true;
    }).map(s => ({ ...s, confidence: s.provenance?.confidence || "PROFILED", legalStatus }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /** adopt: Adopts a standard onto the project and copies its required evidence. */
  adopt(projectId, standardId) {
    const std = STANDARDS_CORPUS.find(s => s.id === standardId);
    if (!std) throw new Error("Standard not in corpus");
    const id = `adopted_${standardId}_${projectId}`;
    const ent = this.kernel.upsert({
      id, type: "Standard", name: std.name, standardId,
      title: std.title, topic: std.topic, layer: std.layer, tier: std.tier, authority: std.authority,
      requiredEvidence: [...(std.requiredEvidence || [])],
      status: "PROJECT_ADOPTED",
      regulatoryDetermination: false,
      provenance: { ...std.provenance, adoptedBy: projectId, note: "Project adoption; not a legal determination" }
    });
    this.kernel.link(projectId, "CONTAINS", id);
    return ent;
  }

  /** all: Returns every entity of a type. */
  all() { return [...STANDARDS_CORPUS].sort((a, b) => a.id.localeCompare(b.id)); }
  /** withOfficialUrl: Performs with official url for this module. */
  withOfficialUrl() { return STANDARDS_CORPUS.filter(s => s.provenance?.source_url || s.provenance?.official_source_url); }
}

for (let i = 0; i < STANDARDS_CORPUS.length; i++) STANDARDS_CORPUS[i] = displayStandard(STANDARDS_CORPUS[i]);
