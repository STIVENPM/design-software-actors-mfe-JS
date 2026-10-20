import type { operations } from '../generated/actors'

export type InstructorCompetency = operations['listInstructorCompetencies']['responses'][200]['content']['application/json'][number]
export type InstructorCompetencyInput = operations['addInstructorCompetency']['requestBody']['content']['application/json']
export type InstructorCompetencyId = operations['removeInstructorCompetency']['parameters']['path']['competency_assignment_id']

// The shell supplies this selection from the academic MFE. It is not an actors API resource.
export interface CompetencySelection {
  id: InstructorCompetencyInput['competency_id']
  label: string
}
