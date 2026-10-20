import type { operations } from '../generated/actors'

export type Learner = operations['getLearner']['responses'][200]['content']['application/json']
export type LearnerCreate = operations['createLearner']['requestBody']['content']['application/json']
export type LearnerUpdate = operations['updateLearner']['requestBody']['content']['application/json']
export type LearnerPage = operations['listLearners']['responses'][200]['content']['application/json']
export type LearnerFichaEnrollment = operations['listLearnerFichaEnrollments']['responses'][200]['content']['application/json'][number]
export type LearnerFichaEnrollmentCreate = operations['createLearnerFichaEnrollment']['requestBody']['content']['application/json']
