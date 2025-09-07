

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."create_tutor_session_from_instant_request"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  tutor_first_name text;
  tutor_last_name text;
BEGIN
  -- Only run when status changes to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Fetch tutor's first and last name
    SELECT first_name, last_name INTO tutor_first_name, tutor_last_name
    FROM tutor_information
    WHERE id = NEW.tutor_id;

    INSERT INTO tutor_sessions (
      tutor_id,
      tutor_first_name,
      tutor_last_name,
      student_id,
      subject,
      difficulty,
      date,
      time,
      duration,
      status,
      type,
      credits_required
    ) VALUES (
      NEW.tutor_id,
      tutor_first_name,
      tutor_last_name,
      NEW.student_id,
      NEW.subject,
      NEW.difficulty,
      CURRENT_DATE,
      'now',
      20,
      'ongoing',
      'instant',
      10
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_tutor_session_from_instant_request"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_instant_request_accept"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Make sure this request wasn't already accepted by another tutor
  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'This request has already been handled (status: %)', OLD.status;
  END IF;

  -- 1. Insert new tutor session
  INSERT INTO tutor_sessions (
    tutor_id,
    tutor_name,
    student_id,
    student_name,
    subject,
    difficulty,
    credits_required,
    status,
    type,
    date,
    time
  )
  VALUES (
    NEW.tutor_id,
    (SELECT CONCAT(first_name, ' ', last_name)
       FROM tutor_information
      WHERE id = NEW.tutor_id),
    NEW.student_id,
    NEW.student_name,
    NEW.subject,
    NEW.difficulty,
    NEW.credits_offered,
    'scheduled',
    'instant',
    CURRENT_DATE,
    CURRENT_TIME
  );

  -- 2. Deduct credits from student (only if they have enough)
  UPDATE student_information
  SET credits = credits - NEW.credits_offered
  WHERE id = NEW.student_id
    AND credits >= NEW.credits_offered;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student does not have enough credits';
  END IF;

  -- 3. Add credits to tutor
  UPDATE tutor_information
  SET credits_earned = credits_earned + NEW.credits_offered
  WHERE id = NEW.tutor_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_instant_request_accept"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_tutor"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Use raw_user_meta_data instead of user_metadata
  IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data->>'role' = 'tutor' THEN
    BEGIN
      INSERT INTO public.tutor_information (
        id, email, first_name, last_name, rating,
        total_sessions, credits_earned, subjects,
        qualification, is_online, is_verified
      )
      VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        0, 0, 0, '{}', '', false, true
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Tutor insert failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_tutor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_request_acceptance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'accepted' AND NEW.tutor_id IS NOT NULL THEN
    INSERT INTO tutor_sessions (
      tutor_id,
      student_id,
      subject,
      difficulty,
      date,
      time,
      duration,
      credits_required,
      status,
      type
    )
    VALUES (
      NEW.tutor_id,
      NEW.student_id,
      NEW.subject,
      NEW.difficulty,
      CURRENT_DATE, -- Default to current date
      CURRENT_TIME, -- Default to current time
      60, -- Default duration in minutes
      NEW.credits_offered,
      'scheduled',
      'instant'
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_request_acceptance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_leaderboard_row"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO leaderboard (student_id, experience, rank)
  VALUES (NEW.id, 0, NULL);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."insert_leaderboard_row"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_sessions_ongoing"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $_$
begin
  update tutor_sessions
  set status = 'ongoing'
  where status = 'scheduled'
    and type = 'booked'                              -- only scheduled bookings
    and time ~ '^\d{2}:\d{2}(:\d{2})?$'             -- ensure time like 14:00 or 14:00:00
    -- Interpret stored date+time as Asia/Kuala_Lumpur local time, then convert to UTC:
    and ( (date::text || ' ' || time)::timestamp at time zone 'Asia/Kuala_Lumpur' ) <= now();
end;
$_$;


ALTER FUNCTION "public"."mark_sessions_ongoing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_instant_request_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  payload json;
BEGIN
  payload := json_build_object(
    'id', NEW.id,
    'status', NEW.status,
    'student_id', NEW.student_id,
    'tutor_id', NEW.tutor_id,
    'subject', NEW.subject,
    'difficulty', NEW.difficulty,
    'credits_offered', NEW.credits_offered,
    'expires_at', NEW.expires_at
  );

  PERFORM pg_notify('instant_requests_channel', payload::text);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_instant_request_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_auth_user_created_tutor"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only run if the column exists
  BEGIN
    IF NEW.user_metadata IS NOT NULL AND NEW.user_metadata->>'role' = 'tutor' THEN
      INSERT INTO public.tutor_information (
        id, email, first_name, last_name, rating,
        total_sessions, credits_earned, subjects,
        qualification, is_online, is_verified
      )
      VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.user_metadata->>'first_name', ''),
        COALESCE(NEW.user_metadata->>'last_name', ''),
        0, 0, 0, '{}', '', false, true
      );
    END IF;
  EXCEPTION WHEN undefined_column THEN
    -- column doesn't exist, just log and skip
    RAISE NOTICE 'Column user_metadata does not exist, skipping tutor insert';
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."on_auth_user_created_tutor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refund_instant_request"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Refund credits only if the request expired or was cancelled
  IF NEW.status IN ('expired', 'cancelled') AND OLD.status = 'pending' THEN
    UPDATE student_information
    SET credits = credits + OLD.credits_offered
    WHERE id = OLD.student_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."refund_instant_request"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_instant_request_student"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only populate student_id when missing AND auth.uid() is available
    IF NEW.student_id IS NULL OR NEW.student_id = '' THEN
      IF auth.uid() IS NOT NULL AND auth.uid() <> '' THEN
        -- cast auth.uid() to uuid only when non-empty
        BEGIN
          NEW.student_id := auth.uid()::uuid;
        EXCEPTION WHEN others THEN
          -- fallback: leave student_id NULL if auth.uid() is not a valid uuid
          NEW.student_id := NULL;
        END;
      ELSE
        NEW.student_id := NULL;
      END IF;
    END IF;

    -- Ensure tutor_id is NULL on initial student-created rows (never assign empty string)
    NEW.tutor_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_instant_request_student"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_leaderboard_experience"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE leaderboard
  SET experience = NEW.experience
  WHERE student_id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_leaderboard_experience"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."instant_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "student_last_name" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "difficulty" "text" NOT NULL,
    "credits_offered" integer NOT NULL,
    "urgent" boolean DEFAULT false NOT NULL,
    "time_requested" timestamp with time zone DEFAULT "now"() NOT NULL,
    "student_first_name" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "tutor_id" "uuid" DEFAULT "auth"."uid"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:15:00'::interval) NOT NULL,
    CONSTRAINT "instant_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."instant_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kv_store_0e871cde" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL
);


ALTER TABLE "public"."kv_store_0e871cde" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leaderboard" (
    "student_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "experience" integer DEFAULT 0 NOT NULL,
    "rank" integer DEFAULT 0,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reward_claimed" boolean DEFAULT false
);


ALTER TABLE "public"."leaderboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learning_progress" (
    "subject" "text",
    "correct_answers" bigint,
    "mistakes" "text"[],
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "difficulty" "text",
    "total_questions" bigint,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."learning_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."peer_groups" (
    "group_name" "text" NOT NULL,
    "subject" "text",
    "difficulty" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "description" "text",
    "member_count" integer DEFAULT 0 NOT NULL,
    "max_members" integer
);


ALTER TABLE "public"."peer_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_information" (
    "email" "text",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "role" "text" DEFAULT 'student'::"text" NOT NULL,
    "credits" integer DEFAULT 0 NOT NULL,
    "experience" integer DEFAULT 0 NOT NULL,
    "level" integer DEFAULT 1 NOT NULL,
    "streak" integer DEFAULT 0 NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "password" "text" DEFAULT '123456'::"text" NOT NULL,
    "sessions_completed" integer DEFAULT 0 NOT NULL,
    "preferred_learning_style" "text",
    "favorite_tutors" "text",
    "last_login" timestamp with time zone,
    "last_claimed" timestamp with time zone,
    "weak_subjects" "text"[]
);


ALTER TABLE "public"."student_information" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."todos" (
    "title" "text",
    "due_date" "date",
    "is_completed" boolean DEFAULT false,
    "priority" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text",
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    CONSTRAINT "todos_category_check" CHECK (("category" = ANY (ARRAY['Study Session'::"text", 'Assignment'::"text", 'Test/Exam'::"text", 'Project'::"text", 'Tutoring'::"text", 'Personal'::"text"]))),
    CONSTRAINT "todos_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"])))
);


ALTER TABLE "public"."todos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tutor_information" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" "text" DEFAULT ''''''::"text" NOT NULL,
    "role" "text" DEFAULT 'tutor'::"text" NOT NULL,
    "rating" numeric DEFAULT 0.0,
    "total_sessions" integer DEFAULT 0,
    "subjects" "text"[] DEFAULT '{}'::"text"[],
    "credits_earned" integer DEFAULT 0,
    "qualification" "text" DEFAULT '{}'::"text"[],
    "is_online" boolean DEFAULT false,
    "email" "text" DEFAULT ''''''::"text" NOT NULL,
    "password" "text",
    "cash_redeemed" integer DEFAULT 0,
    "is_verified" boolean DEFAULT true,
    "last_name" "text" DEFAULT ''''''::"text" NOT NULL,
    "availability" "jsonb" DEFAULT '[]'::"jsonb",
    "students_favorite" integer DEFAULT 0,
    "level" integer DEFAULT 1,
    "bio" "text",
    "experience" "text"
);


ALTER TABLE "public"."tutor_information" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tutor_sessions" (
    "student_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tutor_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject" "text",
    "difficulty" "text",
    "date" "date",
    "time" "text",
    "duration" integer,
    "credits_required" integer NOT NULL,
    "status" "text",
    "type" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tutor_first_name" "text" NOT NULL,
    "tutor_last_name" "text" NOT NULL,
    "is_finished" boolean DEFAULT false NOT NULL,
    CONSTRAINT "tutor_sessions_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'completed'::"text", 'cancelled'::"text", 'ongoing'::"text", 'pending'::"text"]))),
    CONSTRAINT "tutor_sessions_type_check" CHECK (("type" = ANY (ARRAY['instant'::"text", 'booked'::"text"])))
);


ALTER TABLE "public"."tutor_sessions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."instant_requests"
    ADD CONSTRAINT "instant_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kv_store_0e871cde"
    ADD CONSTRAINT "kv_store_0e871cde_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."leaderboard"
    ADD CONSTRAINT "leaderboard_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."leaderboard"
    ADD CONSTRAINT "leaderboard_id_key1" UNIQUE ("id");



ALTER TABLE ONLY "public"."leaderboard"
    ADD CONSTRAINT "leaderboard_pkey" PRIMARY KEY ("student_id");



ALTER TABLE ONLY "public"."leaderboard"
    ADD CONSTRAINT "leaderboard_user_id_key" UNIQUE ("student_id");



ALTER TABLE ONLY "public"."learning_progress"
    ADD CONSTRAINT "learning_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."peer_groups"
    ADD CONSTRAINT "peer_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_information"
    ADD CONSTRAINT "student_information_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."student_information"
    ADD CONSTRAINT "student_information_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."student_information"
    ADD CONSTRAINT "student_information_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."todos"
    ADD CONSTRAINT "todos_pkey" PRIMARY KEY ("user_id", "id");



ALTER TABLE ONLY "public"."tutor_information"
    ADD CONSTRAINT "tutor_information_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."tutor_information"
    ADD CONSTRAINT "tutor_information_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."tutor_information"
    ADD CONSTRAINT "tutor_information_pkey" PRIMARY KEY ("id", "email");



ALTER TABLE ONLY "public"."tutor_sessions"
    ADD CONSTRAINT "tutor_sessions_pkey" PRIMARY KEY ("tutor_id", "id", "student_id");



ALTER TABLE ONLY "public"."learning_progress"
    ADD CONSTRAINT "user_subject_difficulty_unique" UNIQUE ("user_id", "subject", "difficulty");



CREATE INDEX "kv_store_0e871cde_key_idx" ON "public"."kv_store_0e871cde" USING "btree" ("key" "text_pattern_ops");



CREATE OR REPLACE TRIGGER "trg_create_tutor_session_on_accept" AFTER UPDATE ON "public"."instant_requests" FOR EACH ROW EXECUTE FUNCTION "public"."create_tutor_session_from_instant_request"();



CREATE OR REPLACE TRIGGER "trg_insert_leaderboard_row" AFTER INSERT ON "public"."student_information" FOR EACH ROW EXECUTE FUNCTION "public"."insert_leaderboard_row"();



CREATE OR REPLACE TRIGGER "trg_update_leaderboard_experience" AFTER UPDATE OF "experience" ON "public"."student_information" FOR EACH ROW EXECUTE FUNCTION "public"."update_leaderboard_experience"();



ALTER TABLE ONLY "public"."instant_requests"
    ADD CONSTRAINT "instant_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student_information"("id");



ALTER TABLE ONLY "public"."instant_requests"
    ADD CONSTRAINT "instant_requests_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutor_information"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leaderboard"
    ADD CONSTRAINT "leaderboard_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student_information"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_progress"
    ADD CONSTRAINT "learning_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."student_information"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_information"
    ADD CONSTRAINT "student_information_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."todos"
    ADD CONSTRAINT "todos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."student_information"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tutor_information"
    ADD CONSTRAINT "tutor_information_id_fkey1" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tutor_sessions"
    ADD CONSTRAINT "tutor_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student_information"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tutor_sessions"
    ADD CONSTRAINT "tutor_sessions_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutor_information"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Allow students to update tutor ratings" ON "public"."tutor_information" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow tutor existence check" ON "public"."tutor_information" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated can read student info for sessions" ON "public"."student_information" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Finish session by ID" ON "public"."tutor_sessions" FOR UPDATE USING (true) WITH CHECK ((("is_finished" = true) AND ("status" = 'completed'::"text")));



CREATE POLICY "Leaderboard is public to authenticated users" ON "public"."leaderboard" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Students can cancel their own instant requests" ON "public"."instant_requests" FOR UPDATE TO "authenticated" USING ((("student_id" = "auth"."uid"()) AND ("status" = 'pending'::"text"))) WITH CHECK (("status" = 'cancelled'::"text"));



CREATE POLICY "Students can create instant requests" ON "public"."instant_requests" FOR INSERT WITH CHECK ((("student_id" = "auth"."uid"()) AND ("tutor_id" IS NULL) AND ("status" = 'pending'::"text")));



CREATE POLICY "Students can insert their own info" ON "public"."student_information" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Students can insert their own leaderboard entry" ON "public"."leaderboard" FOR INSERT WITH CHECK (("auth"."uid"() = "student_id"));



CREATE POLICY "Students can update their own info" ON "public"."student_information" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Students can update their own leaderboard entry" ON "public"."leaderboard" FOR UPDATE USING (("auth"."uid"() = "student_id"));



CREATE POLICY "Students can view their own info" ON "public"."student_information" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Students can view their own instant requests" ON "public"."instant_requests" FOR SELECT TO "authenticated" USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can view their own sessions" ON "public"."tutor_sessions" FOR SELECT TO "authenticated" USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students or Tutors can insert sessions for themselves" ON "public"."tutor_sessions" FOR INSERT TO "authenticated" WITH CHECK ((("student_id" = "auth"."uid"()) OR ("tutor_id" = "auth"."uid"())));



CREATE POLICY "Tutors can accept instant requests" ON "public"."instant_requests" FOR UPDATE TO "authenticated" USING ((("status" = 'pending'::"text") AND ("tutor_id" IS NULL))) WITH CHECK ((("status" = 'accepted'::"text") AND ("tutor_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."tutor_information"
  WHERE ("tutor_information"."id" = "auth"."uid"())))));



CREATE POLICY "Tutors can insert their own info" ON "public"."tutor_information" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Tutors can insert their own sessions" ON "public"."tutor_sessions" FOR INSERT WITH CHECK (("tutor_id" = "auth"."uid"()));



CREATE POLICY "Tutors can read their own profile" ON "public"."tutor_information" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Tutors can update their own info" ON "public"."tutor_information" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Tutors can view assigned instant requests" ON "public"."instant_requests" FOR SELECT TO "authenticated" USING (("tutor_id" = "auth"."uid"()));



CREATE POLICY "Tutors can view pending instant requests" ON "public"."instant_requests" FOR SELECT TO "authenticated" USING ((("status" = 'pending'::"text") AND ("tutor_id" IS NULL)));



CREATE POLICY "Tutors can view their assigned sessions" ON "public"."tutor_sessions" FOR SELECT TO "authenticated" USING (("tutor_id" = "auth"."uid"()));



CREATE POLICY "User can modify own progress" ON "public"."learning_progress" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own todos" ON "public"."todos" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own todos" ON "public"."todos" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can select their own todos" ON "public"."todos" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own todos" ON "public"."todos" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "allow_valid_tutor_id_insert" ON "public"."instant_requests" FOR INSERT TO "authenticated" WITH CHECK ((("tutor_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."tutor_information"
  WHERE ("tutor_information"."id" = "instant_requests"."tutor_id")))));



CREATE POLICY "allow_valid_tutor_id_update" ON "public"."instant_requests" FOR UPDATE TO "authenticated" WITH CHECK ((("tutor_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."tutor_information"
  WHERE ("tutor_information"."id" = "instant_requests"."tutor_id")))));



CREATE POLICY "insert" ON "public"."instant_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "student_id"));



ALTER TABLE "public"."instant_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kv_store_0e871cde" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leaderboard" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."learning_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."peer_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_information" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."todos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tutor_information" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tutor_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tutors can update student credits" ON "public"."student_information" FOR UPDATE USING ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."tutor_information" "t"
  WHERE ("t"."id" = "auth"."uid"())))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."instant_requests";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."leaderboard";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."student_information";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."todos";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tutor_information";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tutor_sessions";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."create_tutor_session_from_instant_request"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_tutor_session_from_instant_request"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_tutor_session_from_instant_request"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_instant_request_accept"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_instant_request_accept"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_instant_request_accept"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_tutor"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_tutor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_tutor"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_request_acceptance"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_request_acceptance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_request_acceptance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_leaderboard_row"() TO "anon";
GRANT ALL ON FUNCTION "public"."insert_leaderboard_row"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_leaderboard_row"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_sessions_ongoing"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_sessions_ongoing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_sessions_ongoing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_instant_request_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_instant_request_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_instant_request_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_auth_user_created_tutor"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_auth_user_created_tutor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_auth_user_created_tutor"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refund_instant_request"() TO "anon";
GRANT ALL ON FUNCTION "public"."refund_instant_request"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refund_instant_request"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_instant_request_student"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_instant_request_student"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_instant_request_student"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_leaderboard_experience"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_leaderboard_experience"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_leaderboard_experience"() TO "service_role";
























GRANT ALL ON TABLE "public"."instant_requests" TO "anon";
GRANT ALL ON TABLE "public"."instant_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."instant_requests" TO "service_role";



GRANT ALL ON TABLE "public"."kv_store_0e871cde" TO "anon";
GRANT ALL ON TABLE "public"."kv_store_0e871cde" TO "authenticated";
GRANT ALL ON TABLE "public"."kv_store_0e871cde" TO "service_role";



GRANT ALL ON TABLE "public"."leaderboard" TO "anon";
GRANT ALL ON TABLE "public"."leaderboard" TO "authenticated";
GRANT ALL ON TABLE "public"."leaderboard" TO "service_role";



GRANT ALL ON TABLE "public"."learning_progress" TO "anon";
GRANT ALL ON TABLE "public"."learning_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_progress" TO "service_role";



GRANT ALL ON TABLE "public"."peer_groups" TO "anon";
GRANT ALL ON TABLE "public"."peer_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."peer_groups" TO "service_role";



GRANT ALL ON TABLE "public"."student_information" TO "anon";
GRANT ALL ON TABLE "public"."student_information" TO "authenticated";
GRANT ALL ON TABLE "public"."student_information" TO "service_role";



GRANT ALL ON TABLE "public"."todos" TO "anon";
GRANT ALL ON TABLE "public"."todos" TO "authenticated";
GRANT ALL ON TABLE "public"."todos" TO "service_role";



GRANT ALL ON TABLE "public"."tutor_information" TO "anon";
GRANT ALL ON TABLE "public"."tutor_information" TO "authenticated";
GRANT ALL ON TABLE "public"."tutor_information" TO "service_role";



GRANT ALL ON TABLE "public"."tutor_sessions" TO "anon";
GRANT ALL ON TABLE "public"."tutor_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."tutor_sessions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
