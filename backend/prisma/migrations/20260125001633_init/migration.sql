-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "workloadMonthly" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "lessonsPerWeek" INTEGER NOT NULL,
    CONSTRAINT "Allocation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClassAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allocationId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    CONSTRAINT "ClassAllocation_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "Allocation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "timeSlot" INTEGER NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Lesson_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
