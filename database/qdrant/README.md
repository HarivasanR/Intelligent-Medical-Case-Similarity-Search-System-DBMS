# Qdrant model

Collection: `medical_cases`; vector size: 384; distance: cosine.

Each point ID equals the MySQL `medical_cases.id`. Payload fields are `caseId`, `diagnosis`, `age`, `gender`, `category`, and `date`. This lets Qdrant apply structured filters before nearest-neighbour retrieval while MySQL remains the source of truth.
