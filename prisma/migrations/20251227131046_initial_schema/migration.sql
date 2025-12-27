-- CreateEnum
CREATE TYPE "VersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PDF_GENERATED', 'EMAIL_SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "questionnaire_versions" (
    "id" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaire_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "questionnaireVersionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elements" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0.3333,
    "order" INTEGER NOT NULL,

    CONSTRAINT "elements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "levelsDescription" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "scaleMin" INTEGER NOT NULL DEFAULT 0,
    "scaleMax" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_responses" (
    "id" TEXT NOT NULL,
    "questionnaireVersionId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userName" TEXT,
    "userToken" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "answers" JSONB NOT NULL,
    "notes" JSONB,
    "calculatedScores" JSONB,
    "pdfUrl" TEXT,
    "pdfGeneratedAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "dataRetentionUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_versions_versionNumber_key" ON "questionnaire_versions"("versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "areas_questionnaireVersionId_code_key" ON "areas"("questionnaireVersionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "elements_areaId_code_key" ON "elements"("areaId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "questions_elementId_code_key" ON "questions"("elementId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_responses_userToken_key" ON "assessment_responses"("userToken");

-- CreateIndex
CREATE INDEX "assessment_responses_userEmail_idx" ON "assessment_responses"("userEmail");

-- CreateIndex
CREATE INDEX "assessment_responses_status_submittedAt_idx" ON "assessment_responses"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_questionnaireVersionId_fkey" FOREIGN KEY ("questionnaireVersionId") REFERENCES "questionnaire_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elements" ADD CONSTRAINT "elements_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "elements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_questionnaireVersionId_fkey" FOREIGN KEY ("questionnaireVersionId") REFERENCES "questionnaire_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
