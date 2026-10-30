Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.

License: GNU General Public License v3.0 only (GPL-3.0-only).

# External adapter contracts and closure boundaries

The browser-only platform cannot silently act as a supplier portal, carrier, customs authority, warehouse-management system or calibration authority. These are explicit data adapters. Each adapter must map an external record into the domain contracts below, preserve source evidence and fail closed when required fields are missing.

## 1. Common adapter envelope

Every imported record should be wrapped with:

```json
{
  "schemaVersion": "1.0",
  "sourceSystem": "PROVIDER_OR_FILE_ID",
  "sourceRecordId": "STABLE_EXTERNAL_ID",
  "retrievedAt": "2026-10-30T12:00:00Z",
  "jurisdiction": "IN",
  "evidenceRef": "EVIDENCE_OR_ARTIFACT_ID",
  "dataStatus": "VERIFIED",
  "payload": {}
}
```

Required controls:
- source identity and source record ID;
- timezone-qualified retrieval time;
- jurisdiction and evidence reference;
- explicit data status;
- input snapshot hash/version in the adapter;
- idempotency key for repeated imports;
- user-visible disclosure before any data is sent outside the browser.

`UNKNOWN`, `STALE`, `UNVERIFIED`, missing source identity or missing evidence must not be silently promoted.

## 2. Supplier / procurement adapter

Input mapping:
- supplier identity, part/material, offer capacity, price and currency;
- promised lead time and delivery calendar;
- approval/qualification status;
- lifecycle state and last-time-buy/obsolescence status;
- manufacturing origin, process, facility, jurisdiction;
- export-control status and license evidence;
- supplier capacity snapshot and validity interval.

Map the normalized offer to `supply({order, suppliers, planningDate, ...})` or the optional `optimize_sourcing()` input. An offer is not a purchase order. Purchase-order creation requires a separately authorized procurement workflow.

Suggested transaction mappings:
- EDI 850 - purchase order request;
- EDI 855 - purchase order acknowledgment;
- EDI 856 - advance ship notice;
- EDI 810 - invoice.
The module does not implement EDI transport or trading-partner certification. The adapter must map and validate message semantics, IDs, quantities, units, dates and acknowledgments before use.

## 3. WMS / inventory adapter

Input mapping:
- inventory record ID, part, lot, serials, on-hand, reserved, quality state;
- warehouse/bin/location;
- receipt date, expiry date and shelf-life evidence;
- origin and process genealogy;
- quarantine/release status and quality evidence.

Only `qualityStatus: RELEASED` and `onHand - reserved` are eligible in the planner. A WMS receipt event does not imply QA release. Use stable inventory IDs and versioned snapshots; replan after any reservation or quantity mutation.

## 4. Carrier / TMS adapter

Input mapping:
- shipment ID, order/line, part, quantity, lot/serial;
- origin/destination and lane ID;
- carrier identity, mode, capacity, ETA and event milestones;
- export/customs status and handling authorizations;
- hazardous/battery/pressure-vessel permission;
- event time, location, actor, business step, disposition and evidence.

Map route data to `planTransportRoute()` and milestone data to `appendShipmentEvent()` / `toEpcisEventProjection()`. The route planner does not book a carrier. A carrier ETA is not a receipt. Arrival is not QA release.

## 5. Customs / export-control adapter

The adapter must return:
- jurisdiction/regime and classification source;
- item classification and HS code with classification evidence;
- origin and destination;
- end user and end use;
- restricted-party and destination screening status;
- license requirement/status and license reference;
- customs filing/release status and evidence;
- screening time and validity/expiry.

Map into `assessTradeCompliance()`. Do not infer a classification from a part name. Do not use a generic "clear" flag without the underlying evidence. The function is a workflow gate, not a legal determination. Actual decisions require authoritative current data and qualified review.

## 6. Service / repair / calibration adapter

Input mapping:
- service depot identity, authorization, geographic zones and response days;
- spare part list and stock state;
- calibration capability, certificate ID, validity and due date;
- technician qualification and repair capability;
- repair/refurbishment inspection and environmental disposition evidence.

Map coverage to `assessServiceCoverage()` and reverse flow to `transitionReturnCase()`. Expired calibration or missing technician/depot authorization must not qualify a service location.

## 7. Data exchange and browser-only policy

Supported core exchange format is JSON. CSV import can be added in the browser UI with explicit schema validation and preview before import. Do not use a server as an invisible intermediary. If a user chooses Colab, disclose exactly which input snapshot is uploaded and provide a synthetic-data mode by default.

## 8. Adapter conformance test expectations

Every provider adapter must test:
- valid minimum record;
- missing required ID/evidence;
- duplicate external ID;
- stale or timezone-naive timestamp;
- invalid units/currency;
- unknown status;
- replayed event/idempotency key;
- contradictory quantity/date/state;
- provider timeout/error;
- source version change between planning and commit;
- user cancellation and no-data-leaves-browser path.

Do not mark an external adapter complete until its provider sandbox tests and failure/retry/idempotency tests pass.
