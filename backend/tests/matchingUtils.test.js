const { calculateMLSkillSimilarity } = require("../utils/huggingfaceMatching");

describe("HuggingFace matching utility", () => {
  test("should compute a positive similarity for matching embeddings", async () => {
    const gigSkills = [
      { skill: "React", embedding: [0.1, 0.2, 0.3] },
      { skill: "Node.js", embedding: [0.0, 0.1, 0.2] },
    ];
    const freelancerSkills = [
      { name: "React", embedding: [0.1, 0.2, 0.25] },
      { name: "Express", embedding: [0.0, 0.05, 0.1] },
    ];

    const similarity = await calculateMLSkillSimilarity(gigSkills, freelancerSkills);

    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThanOrEqual(1);
  });

  test("should return 0 when one side has no skills", async () => {
    const similarity = await calculateMLSkillSimilarity([], [{ name: "React", embedding: [0.1, 0.2, 0.3] }]);
    expect(similarity).toBe(0);
  });
});
