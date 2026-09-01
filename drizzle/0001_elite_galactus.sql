CREATE TABLE "academic"."course_non_instructional_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"date" date NOT NULL,
	"reason" varchar(150),
	CONSTRAINT "course_non_instr_course_date_uidx" UNIQUE("course_id","date")
);
--> statement-breakpoint
CREATE TABLE "academic"."courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"school_year_id" uuid NOT NULL,
	"grade" varchar(20) NOT NULL,
	"section" varchar(5) NOT NULL,
	"education_level" varchar(20) NOT NULL,
	"is_homeroom" boolean DEFAULT false NOT NULL,
	"subject_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "courses_user_year_grade_section_subject_uidx" UNIQUE("user_id","school_year_id","grade","section","subject_id")
);
--> statement-breakpoint
CREATE TABLE "academic"."official_non_instructional_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_year_id" uuid NOT NULL,
	"date" date NOT NULL,
	"reason" varchar(150),
	CONSTRAINT "official_non_instr_school_year_date_uidx" UNIQUE("school_year_id","date")
);
--> statement-breakpoint
CREATE TABLE "academic"."school_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(9) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	CONSTRAINT "school_years_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "academic"."students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"order_number" smallint NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"second_name" varchar(100),
	"first_lastname" varchar(100) NOT NULL,
	"second_lastname" varchar(100),
	"birth_date" date,
	"sex" varchar(1),
	"active" boolean DEFAULT true NOT NULL,
	"withdrawal_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "students_course_order_uidx" UNIQUE("course_id","order_number")
);
--> statement-breakpoint
CREATE TABLE "attendance"."attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"date" date NOT NULL,
	"event_type" varchar(20) DEFAULT 'REGULAR' NOT NULL,
	"status_code" varchar(1) NOT NULL,
	"excuse_reason_code" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_student_course_date_event_uidx" UNIQUE("student_id","course_id","date","event_type")
);
--> statement-breakpoint
CREATE TABLE "attendance"."attendance_statuses" (
	"code" varchar(1) PRIMARY KEY NOT NULL,
	"name" varchar(30) NOT NULL,
	"sort_order" varchar(2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance"."excuse_reasons" (
	"code" varchar(20) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academic"."course_non_instructional_days" ADD CONSTRAINT "course_non_instructional_days_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "academic"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic"."courses" ADD CONSTRAINT "courses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic"."courses" ADD CONSTRAINT "courses_school_year_id_school_years_id_fk" FOREIGN KEY ("school_year_id") REFERENCES "academic"."school_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic"."courses" ADD CONSTRAINT "courses_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "academic"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic"."official_non_instructional_days" ADD CONSTRAINT "official_non_instructional_days_school_year_id_school_years_id_fk" FOREIGN KEY ("school_year_id") REFERENCES "academic"."school_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic"."students" ADD CONSTRAINT "students_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "academic"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance"."attendance_records" ADD CONSTRAINT "attendance_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "academic"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance"."attendance_records" ADD CONSTRAINT "attendance_records_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "academic"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance"."attendance_records" ADD CONSTRAINT "attendance_records_status_code_attendance_statuses_code_fk" FOREIGN KEY ("status_code") REFERENCES "attendance"."attendance_statuses"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance"."attendance_records" ADD CONSTRAINT "attendance_records_excuse_reason_code_excuse_reasons_code_fk" FOREIGN KEY ("excuse_reason_code") REFERENCES "attendance"."excuse_reasons"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "courses_user_year_idx" ON "academic"."courses" USING btree ("user_id","school_year_id");--> statement-breakpoint
CREATE INDEX "students_course_active_idx" ON "academic"."students" USING btree ("course_id","active");--> statement-breakpoint
CREATE INDEX "attendance_course_date_idx" ON "attendance"."attendance_records" USING btree ("course_id","date");