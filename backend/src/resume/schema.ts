import { z } from "zod";

// Every field is required. `null` means "not found in the resume";
// arrays are `[]` when empty. Dates are kept as written (e.g. "Jan 2021").

export const ContactInfoSchema = z.object({
  fullName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  links: z.array(z.string()),
});

export const ExperienceEntrySchema = z.object({
  title: z.string().nullable(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  highlights: z.array(z.string()),
});

export const EducationEntrySchema = z.object({
  institution: z.string().nullable(),
  degree: z.string().nullable(),
  fieldOfStudy: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});

export const ProjectEntrySchema = z.object({
  name: z.string().nullable(),
  description: z.string().nullable(),
  highlights: z.array(z.string()),
});

export const ResumeSchema = z.object({
  contact: ContactInfoSchema,
  summary: z.string().nullable(),
  experience: z.array(ExperienceEntrySchema),
  education: z.array(EducationEntrySchema),
  skills: z.array(z.string()),
  certifications: z.array(z.string()),
  projects: z.array(ProjectEntrySchema),
});

export type ContactInfo = z.infer<typeof ContactInfoSchema>;
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>;
export type EducationEntry = z.infer<typeof EducationEntrySchema>;
export type ProjectEntry = z.infer<typeof ProjectEntrySchema>;
export type Resume = z.infer<typeof ResumeSchema>;
