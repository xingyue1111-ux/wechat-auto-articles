"use client";

import { useActionState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";
import {
  generateVisualBriefAction,
  type GenerateVisualBriefState
} from "@/app/admin/actions";

const initialState: GenerateVisualBriefState = { status: "idle" };

export function GenerateBriefForm() {
  const [state, formAction, isPending] = useActionState(generateVisualBriefAction, initialState);

  return (
    <form action={formAction} className="generate-form">
      <button type="submit" disabled={isPending} aria-busy={isPending}>
        {isPending ? <LoaderCircle className="spin" size={18} /> : <ImagePlus size={18} />}
        <span style={{ marginLeft: 8 }}>{isPending ? "生成中，请稍候" : "生成今日长图简报"}</span>
      </button>
      {isPending ? <p className="form-note">正在生成多张长图，可能需要数分钟，请勿重复点击。</p> : null}
      {state.status === "error" ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
