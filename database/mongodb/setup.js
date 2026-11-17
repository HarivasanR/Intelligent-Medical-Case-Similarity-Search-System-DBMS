// First-boot initializer; db:migrate installs the same validator on existing volumes.
db = db.getSiblingDB("medmatch");
// mongosh exposes CommonJS require in Docker init scripts.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const schema = JSON.parse(require("fs").readFileSync("/docker-entrypoint-initdb.d/model.json", "utf8"));
if (!db.getCollectionNames().includes("clinical_records")) db.createCollection("clinical_records");
db.runCommand({ collMod: "clinical_records", validator: { $jsonSchema: schema }, validationLevel: "strict", validationAction: "error" });
db.clinical_records.createIndex({ caseId: 1 }, { unique: true });
db.clinical_records.createIndex({ createdAt: -1 });
// Aggregate keys of the actual laboratory map emitted by forms and seed records.
db.clinical_records.aggregate([
  { $project: { entries: { $objectToArray: "$laboratoryResults" } } },
  { $unwind: "$entries" },
  { $group: { _id: "$entries.k", casesWithField: { $sum: 1 } } },
  { $sort: { casesWithField: -1 } }
]);
