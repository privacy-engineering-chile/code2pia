import type { PrivacyDeclaration } from "../../declarations/schema.js";
import type { ScanResult } from "../../core/scan/types.js";
import type { RopaDraft } from "../types.js";
import { sensitiveCategories } from "./mappings.js";

export function generateRopaDraft(scanResult: ScanResult, declaration?: PrivacyDeclaration): RopaDraft {
  const detectedFields = [...new Set(scanResult.personalData.map((item) => item.field))];
  const sensitiveData = [...new Set(scanResult.personalData.filter((item) => sensitiveCategories.has(item.category)).map((item) => item.field))];

  const declaredActivities = declaration?.processingActivities ?? [];
  const activities =
    declaredActivities.length > 0
      ? declaredActivities.map((activity) => ({
          id: activity.id,
          name: activity.name ?? activity.activityName ?? activity.id,
          purpose: activity.purpose,
          lawfulBasis: activity.lawfulBasis,
          dataSubjects: activity.dataSubjects,
          personalData: activity.personalData.length > 0 ? activity.personalData : detectedFields,
          sensitiveData: activity.sensitiveData.length > 0 ? activity.sensitiveData : sensitiveData,
          retention: activity.retention,
          processors: activity.processors,
          recipients: activity.recipients,
          internationalTransfers: activity.internationalTransfers,
          securityMeasures: activity.securityMeasures
        }))
      : [
          {
            id: "activity_detected_001",
            name: "Detected processing activity",
            purpose: undefined,
            lawfulBasis: undefined,
            dataSubjects: ["unknown"],
            personalData: detectedFields,
            sensitiveData,
            retention: undefined,
            processors: [],
            recipients: scanResult.dataFlows.filter((flow) => flow.externalRecipient).map((flow) => flow.to),
            internationalTransfers: [],
            securityMeasures: []
          }
        ];

  return {
    jurisdiction: "CL",
    lawName: "Ley 21.719",
    controller: declaration?.controller,
    service: declaration?.service ?? scanResult.repository,
    activities
  };
}
