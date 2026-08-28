db = db.getSiblingDB("medmatch");
db.createCollection("clinical_records", {
  validator: { $jsonSchema: { bsonType: "object", required: ["caseId", "laboratoryResults", "createdAt"], properties: {
    caseId: { bsonType: ["int", "long"] }, laboratoryResults: { bsonType: "object" }, observations: { bsonType: ["array", "object"] },
    examinationDetails: { bsonType: "object" }, diagnosticReports: { bsonType: "array" }, additionalMetadata: { bsonType: "object" }, createdAt: { bsonType: "date" }
  } } }
});
db.clinical_records.createIndex({ caseId: 1 }, { unique: true });
db.clinical_records.createIndex({ "laboratoryResults.testName": 1 });
db.clinical_records.createIndex({ createdAt: -1 });

// Meaningful aggregation: summarize abnormal lab findings by test name.
db.clinical_records.aggregate([
  { $unwind: "$laboratoryResults" },
  { $match: { "laboratoryResults.abnormal": true } },
  { $group: { _id: "$laboratoryResults.testName", abnormalCount: { $sum: 1 }, averageValue: { $avg: "$laboratoryResults.numericValue" } } },
  { $sort: { abnormalCount: -1 } }
]);
