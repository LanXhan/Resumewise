import { describe, it, expect } from "vitest";
import { ResumeSchema, type Resume } from "./schema.js";

const fullResume: Resume = {
  contact: {
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "+1 555 123 4567",
    location: "Manila, PH",
    links: ["https://linkedin.com/in/janedoe"],
  },
  summary: "Full-stack developer with 5 years of experience.",
  experience: [
    {
      title: "Software Engineer",
      company: "Acme Corp",
      location: "Remote",
      startDate: "Jan 2021",
      endDate: null,
      isCurrent: true,
      highlights: ["Built the billing API in Node.js"],
    },
  ],
  education: [
    {
      institution: "University of the Philippines",
      degree: "BS",
      fieldOfStudy: "Computer Science",
      startDate: "2015",
      endDate: "2019",
    },
  ],
  skills: ["TypeScript", "React", "PostgreSQL"],
  certifications: ["AWS Certified Developer"],
  projects: [{ name: "Resumewise", description: "Resume optimizer", highlights: [] }],
};

const emptyResume: Resume = {
  contact: { fullName: null, email: null, phone: null, location: null, links: [] },
  summary: null,
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
};

describe("ResumeSchema", () => {
  it("accepts a complete resume", () => {
    expect(ResumeSchema.safeParse(fullResume).success).toBe(true);
  });

  it("accepts a resume where nothing was found", () => {
    expect(ResumeSchema.safeParse(emptyResume).success).toBe(true);
  });

  it("rejects a missing required key", () => {
    const { experience: _, ...withoutExperience } = fullResume;
    const result = ResumeSchema.safeParse(withoutExperience);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["experience"]);
  });

  it("rejects a wrong type", () => {
    const result = ResumeSchema.safeParse({ ...fullResume, skills: "React, Node" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["skills"]);
  });

  it("strips unknown keys instead of failing", () => {
    const result = ResumeSchema.safeParse({ ...fullResume, hobbies: ["chess"] });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("hobbies");
  });
});
