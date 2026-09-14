import { Router } from "express";
import { checkNotSuspended } from "@/shared/middleware/check-not-suspended.middleware.js";
import { requireAuth } from "@/shared/middleware/require-auth.middleware.js";
import { validate } from "@/shared/middleware/validate.middleware.js";
import { addStudentSchema } from "../../domain/add-student.schema.js";
import { cloneCoursesSchema } from "../../domain/clone-courses.schema.js";
import { createCourseSchema } from "../../domain/create-course.schema.js";
import { createSchoolYearSchema } from "../../domain/create-school-year.schema.js";
import * as coursesController from "./courses.controller.js";
import * as schoolYearsController from "./school-years.controller.js";
import * as studentsController from "./students.controller.js";
import * as subjectsController from "./subjects.controller.js";

export const academicRouter = Router();

academicRouter.get("/subjects", subjectsController.listSubjects);
academicRouter.get("/school-years", schoolYearsController.listSchoolYears);

academicRouter.use(requireAuth);
academicRouter.use(checkNotSuspended);

academicRouter.post(
	"/school-years",
	validate(createSchoolYearSchema),
	schoolYearsController.createSchoolYear,
);

academicRouter.post("/courses", validate(createCourseSchema), coursesController.createCourse);

academicRouter.get("/courses", coursesController.listCourses);

academicRouter.patch(
	"/courses/:courseId",
	validate(createCourseSchema),
	coursesController.updateCourse,
);

academicRouter.post("/courses/clone", validate(cloneCoursesSchema), coursesController.cloneCourses);

academicRouter.post(
	"/courses/:courseId/students",
	validate(addStudentSchema),
	studentsController.addStudent,
);

academicRouter.get("/courses/:courseId/students", studentsController.listStudents);

academicRouter.patch(
	"/courses/:courseId/students/:studentId",
	validate(addStudentSchema),
	studentsController.updateStudent,
);

academicRouter.patch(
	"/courses/:courseId/students/:studentId/withdraw",
	studentsController.withdrawStudent,
);

academicRouter.delete("/courses/:courseId", coursesController.deleteCourse);
