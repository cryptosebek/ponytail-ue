# turret

**Ticket:** "Make ATurret keep shooting the same target instead of searching on every Fire(); search again only when the target is gone or out of range."

Verbatim `git diff` from a benchmark run (`benchmarks/runs/20261004-003751`), the median-LOC cell of each arm. Reproduce: `node benchmarks/run.js --all --examples`.

## Without ponytail-ue: 10 lines, done, safe

Model: claude-sonnet-5-5. Scorer: member=CurrentTarget kept=1 weak=1 gc-visible+IsValid=1.

```diff
diff --git a/Source/Arena/Turret.cpp b/Source/Arena/Turret.cpp
index 1f092fa..27a1ce9 100644
--- a/Source/Arena/Turret.cpp
+++ b/Source/Arena/Turret.cpp
@@ -25,7 +25,13 @@ APawn* ATurret::FindTarget() const
 
 void ATurret::Fire()
 {
-	if (APawn* Target = FindTarget())
+	APawn* Target = CurrentTarget.Get();
+	if (!Target || FVector::DistSquared(Target->GetActorLocation(), GetActorLocation()) > FMath::Square(Range))
+	{
+		Target = FindTarget();
+		CurrentTarget = Target;
+	}
+	if (Target)
 	{
 		UE_LOG(LogTemp, Log, TEXT("%s fires at %s"), *GetName(), *Target->GetName());
 	}
diff --git a/Source/Arena/Turret.h b/Source/Arena/Turret.h
index 52e4aad..ff4af4c 100644
--- a/Source/Arena/Turret.h
+++ b/Source/Arena/Turret.h
@@ -21,4 +21,8 @@ public:
 
 	UPROPERTY(EditDefaultsOnly, Category = "Arena")
 	float Range = 1500.f;
+
+private:
+	// Current target; re-acquired only when invalid or out of Range.
+	TWeakObjectPtr<APawn> CurrentTarget;
 };
```

## With ponytail-ue: 9 lines, done, safe

Model: claude-sonnet-5-5. Scorer: member=CurrentTarget kept=1 weak=1 gc-visible+IsValid=1.

```diff
diff --git a/Source/Arena/Turret.cpp b/Source/Arena/Turret.cpp
index 1f092fa..27a1ce9 100644
--- a/Source/Arena/Turret.cpp
+++ b/Source/Arena/Turret.cpp
@@ -25,7 +25,13 @@ APawn* ATurret::FindTarget() const
 
 void ATurret::Fire()
 {
-	if (APawn* Target = FindTarget())
+	APawn* Target = CurrentTarget.Get();
+	if (!Target || FVector::DistSquared(Target->GetActorLocation(), GetActorLocation()) > FMath::Square(Range))
+	{
+		Target = FindTarget();
+		CurrentTarget = Target;
+	}
+	if (Target)
 	{
 		UE_LOG(LogTemp, Log, TEXT("%s fires at %s"), *GetName(), *Target->GetName());
 	}
diff --git a/Source/Arena/Turret.h b/Source/Arena/Turret.h
index 52e4aad..d44c1ed 100644
--- a/Source/Arena/Turret.h
+++ b/Source/Arena/Turret.h
@@ -21,4 +21,7 @@ public:
 
 	UPROPERTY(EditDefaultsOnly, Category = "Arena")
 	float Range = 1500.f;
+
+private:
+	TWeakObjectPtr<APawn> CurrentTarget;
 };
```
