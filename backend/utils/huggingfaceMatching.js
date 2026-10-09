/**
 * HuggingFace-based ML Skill Matching Utility
 * Uses sentence transformers for semantic similarity scoring
 */

let pipelineLoaded = false;
let pipeline = null;

async function initializePipeline() {
  if (pipelineLoaded) return pipeline;

  try {
    const { pipeline: hfPipeline } = await import("@xenova/transformers");
    // Use feature-extraction to get embeddings for similarity
    pipeline = await hfPipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    pipelineLoaded = true;
    console.log("✅ HuggingFace transformer pipeline initialized");
    return pipeline;
  } catch (error) {
    console.error("❌ Failed to initialize HuggingFace pipeline:", error.message);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vecA - First vector
 * @param {Array<number>} vecB - Second vector
 * @returns {number} Similarity score 0-1
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : (dotProduct / denominator + 1) / 2; // Normalize to 0-1
}

/**
 * Get embedding for a skill or text using HuggingFace
 * @param {string} text - Skill name or description
 * @returns {Promise<Array<number>>} Embedding vector
 */
async function getEmbedding(text) {
  try {
    if (!text || typeof text !== "string") return null;

    const pipe = await initializePipeline();
    const result = await pipe(text.toLowerCase().trim(), {
      pooling: "mean",
      normalize: true,
    });

    // Convert to array if needed
    if (result.data instanceof Float32Array || result.data instanceof Array) {
      return Array.from(result.data);
    }
    return result;
  } catch (error) {
    console.error("❌ Error getting embedding:", error.message);
    return null;
  }
}

/**
 * Normalize a skill entry to text for embedding lookup.
 * Supports raw strings, { skill }, { name }, and { skill, embedding } objects.
 */
function normalizeSkillText(skill) {
  if (!skill) return "";
  if (typeof skill === "string") return skill.trim();
  if (typeof skill === "object") {
    if (typeof skill.skill === "string" && skill.skill.trim()) return skill.skill.trim();
    if (typeof skill.name === "string" && skill.name.trim()) return skill.name.trim();
  }
  return String(skill).trim();
}

async function buildEmbeddings(skillItems) {
  if (!Array.isArray(skillItems) || skillItems.length === 0) return [];

  return Promise.all(
    skillItems.map(async (skillItem) => {
      if (!skillItem) return null;

      if (typeof skillItem === "object" && Array.isArray(skillItem.embedding) && skillItem.embedding.length > 0) {
        return skillItem.embedding;
      }

      const text = normalizeSkillText(skillItem);
      if (!text) return null;
      return getEmbedding(text).catch(() => null);
    })
  );
}

/**
 * Calculate ML-based skill similarity using HuggingFace embeddings
 * @param {Array<string|object>} gigSkills - Skills required for gig
 * @param {Array<string|object>} freelancerSkills - Freelancer's skills
 * @returns {Promise<number>} Similarity score 0-1
 */
async function calculateMLSkillSimilarity(gigSkills, freelancerSkills) {
  try {
    if (!Array.isArray(gigSkills) || !Array.isArray(freelancerSkills)) {
      return 0;
    }

    if (gigSkills.length === 0 || freelancerSkills.length === 0) {
      return 0;
    }

    const gigEmbeddings = await buildEmbeddings(gigSkills);
    const freelancerEmbeddings = await buildEmbeddings(freelancerSkills);

    const validGigEmbeddings = gigEmbeddings.filter((e) => e !== null);
    const validFreelancerEmbeddings = freelancerEmbeddings.filter((e) => e !== null);

    if (validGigEmbeddings.length === 0 || validFreelancerEmbeddings.length === 0) {
      return 0;
    }

    let totalSimilarity = 0;
    let comparisons = 0;

    for (const gigEmb of validGigEmbeddings) {
      for (const freelancerEmb of validFreelancerEmbeddings) {
        totalSimilarity += cosineSimilarity(gigEmb, freelancerEmb);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  } catch (error) {
    console.error("❌ Error calculating ML skill similarity:", error.message);
    return 0;
  }
}

/**
 * Batch calculate similarities for multiple freelancers
 * @param {Array<string>} gigSkills - Skills required for gig
 * @param {Array<{skills: Array<string>}>} freelancerProfiles - Array of freelancer profiles
 * @returns {Promise<Array<{freelancerId: string, mlSimilarity: number}>>}
 */
async function batchCalculateSkillSimilarity(gigSkills, freelancerProfiles) {
  try {
    const results = await Promise.all(
      freelancerProfiles.map(async (profile) => {
        const freelancerSkillsOrEmbeddings = (profile.skillEmbeddings && profile.skillEmbeddings.length > 0) ? profile.skillEmbeddings : (profile.skills || []);
        return {
          freelancerId: profile._id || profile.id,
          mlSimilarity: await calculateMLSkillSimilarity(gigSkills, freelancerSkillsOrEmbeddings),
        };
      })
    );
    return results;
  } catch (error) {
    console.error("❌ Error in batch calculation:", error.message);
    return [];
  }
}

module.exports = {
  initializePipeline,
  getEmbedding,
  calculateMLSkillSimilarity,
  batchCalculateSkillSimilarity,
  cosineSimilarity,
};
