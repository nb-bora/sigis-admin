import { Fragment } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FormStepperStep = {
  id: string;
  title: string;
  description?: string;
};

type FormStepperProps = {
  steps: FormStepperStep[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  allowBackNavigation?: boolean;
  className?: string;
};

export function FormStepper({
  steps,
  currentStep,
  onStepClick,
  allowBackNavigation = true,
  className,
}: FormStepperProps) {
  return (
    <nav aria-label="Étapes du formulaire" className={cn("w-full", className)}>
      <ol className="flex w-full list-none items-start gap-0 p-0">
        {steps.map((step, index) => {
          const done = index < currentStep;
          const current = index === currentStep;
          const canClick = allowBackNavigation && onStepClick && index < currentStep;
          const segmentDone = currentStep > index;

          const circle = (
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors sm:h-9 sm:w-9 sm:text-sm",
                done &&
                  "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20",
                current &&
                  !done &&
                  "border-primary bg-background text-primary ring-4 ring-primary/15",
                !done &&
                  !current &&
                  "border-muted-foreground/30 bg-background text-muted-foreground",
              )}
            >
              {done ? (
                <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              ) : (
                index + 1
              )}
            </span>
          );

          const labelBlock = (
            <span className="mt-2 block max-w-[5.5rem] text-center sm:max-w-[7rem]">
              <span
                className={cn(
                  "block text-[11px] font-semibold leading-tight sm:text-xs",
                  current ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.title}
              </span>
              {step.description ? (
                <span className="mt-0.5 hidden text-[10px] font-normal leading-snug text-muted-foreground sm:line-clamp-2">
                  {step.description}
                </span>
              ) : null}
            </span>
          );

          const stepBody = canClick ? (
            <button
              type="button"
              onClick={() => onStepClick?.(index)}
              className="group flex w-full min-w-0 flex-col items-center rounded-lg pb-1 pt-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {circle}
              {labelBlock}
            </button>
          ) : (
            <div
              className="flex w-full min-w-0 flex-col items-center"
              aria-current={current ? "step" : undefined}
            >
              {circle}
              {labelBlock}
            </div>
          );

          return (
            <Fragment key={step.id}>
              <li className="flex min-w-0 flex-1 flex-col items-stretch">{stepBody}</li>
              {index < steps.length - 1 ? (
                <li className="flex h-8 shrink-0 items-center px-0.5 sm:px-1" aria-hidden>
                  <div
                    className={cn(
                      "h-0.5 w-full min-w-[0.75rem] rounded-full transition-colors",
                      segmentDone ? "bg-primary" : "bg-muted",
                    )}
                  />
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

type FormStepperActionsProps = {
  currentStep: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  nextLabel?: string;
  prevLabel?: string;
  nextDisabled?: boolean;
  className?: string;
};

/** Barre Précédent / Suivant pour formulaires multi-étapes (utilisez vos boutons primaires à côté au dernier pas). */
export function FormStepperActions({
  currentStep,
  totalSteps,
  onPrev,
  onNext,
  nextLabel = "Suivant",
  prevLabel = "Précédent",
  nextDisabled = false,
  className,
}: FormStepperActionsProps) {
  const isFirst = currentStep <= 0;
  const isLast = currentStep >= totalSteps - 1;

  if (isLast) {
    return <div className={cn("min-h-[2.5rem]", className)} />;
  }

  return (
    <div
      className={cn(
        "flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex justify-center sm:justify-start">
        {isFirst ? (
          <span className="min-h-10 sm:min-w-[1px]" aria-hidden />
        ) : (
          <Button type="button" variant="ghost" className="h-10 rounded-xl text-muted-foreground" onClick={onPrev}>
            {prevLabel}
          </Button>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="button" className="h-10 min-w-[120px] rounded-xl" onClick={onNext} disabled={nextDisabled}>
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
