-- CreateEnum
CREATE TYPE "InternshipStatus" AS ENUM ('Saved', 'Applied', 'Interview', 'Offer', 'Rejected');

-- CreateEnum
CREATE TYPE "InternshipSource" AS ENUM ('Internshala', 'Unstop');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Internship" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "stipend" TEXT,
    "duration" TEXT,
    "description" TEXT,
    "postedDate" TIMESTAMP(3),
    "applyUrl" TEXT NOT NULL,
    "source" "InternshipSource" NOT NULL,
    "sourceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Internship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedInternship" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "internshipId" TEXT NOT NULL,
    "status" "InternshipStatus" NOT NULL DEFAULT 'Saved',
    "notes" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedInternship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Internship_applyUrl_key" ON "Internship"("applyUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Internship_sourceId_source_key" ON "Internship"("sourceId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "SavedInternship_userId_internshipId_key" ON "SavedInternship"("userId", "internshipId");

-- AddForeignKey
ALTER TABLE "SavedInternship" ADD CONSTRAINT "SavedInternship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedInternship" ADD CONSTRAINT "SavedInternship_internshipId_fkey" FOREIGN KEY ("internshipId") REFERENCES "Internship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
