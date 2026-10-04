# regen

**Ticket:** "Make AArenaCharacter regenerate 5 health every 2 seconds, up to MaxHealth."

Verbatim `git diff` from a benchmark run (run directory `20261004-010115`), the median-LOC cell of each arm. Reproduce: `node benchmarks/run.js --all --examples`.

## Without ponytail-ue: 18 lines, done, safe

Model: claude-sonnet-5-5. Scorer: regen=1 periodic=1 tick-ignores-delta=0.

```diff
diff --git a/Source/Arena/ArenaCharacter.cpp b/Source/Arena/ArenaCharacter.cpp
index ae2be8f..3f2d5cc 100644
--- a/Source/Arena/ArenaCharacter.cpp
+++ b/Source/Arena/ArenaCharacter.cpp
@@ -1,11 +1,24 @@
 #include "ArenaCharacter.h"
 #include "GameFramework/CharacterMovementComponent.h"
+#include "TimerManager.h"
 
 AArenaCharacter::AArenaCharacter()
 {
 	PrimaryActorTick.bCanEverTick = false;
 }
 
+void AArenaCharacter::BeginPlay()
+{
+	Super::BeginPlay();
+
+	GetWorldTimerManager().SetTimer(RegenTimerHandle, this, &AArenaCharacter::RegenTick, RegenInterval, true);
+}
+
+void AArenaCharacter::RegenTick()
+{
+	Health = FMath::Min(Health + RegenAmount, MaxHealth);
+}
+
 void AArenaCharacter::Hurt(float Amount)
 {
 	Health = FMath::Clamp(Health - Amount, 0.f, MaxHealth);
diff --git a/Source/Arena/ArenaCharacter.h b/Source/Arena/ArenaCharacter.h
index e49c21c..14a247e 100644
--- a/Source/Arena/ArenaCharacter.h
+++ b/Source/Arena/ArenaCharacter.h
@@ -27,6 +27,18 @@ public:
 	UPROPERTY(EditDefaultsOnly, Category = "Arena")
 	float SprintMult = 1.5f;
 
+	UPROPERTY(EditDefaultsOnly, Category = "Arena")
+	float RegenAmount = 5.f;
+
+	UPROPERTY(EditDefaultsOnly, Category = "Arena")
+	float RegenInterval = 2.f;
+
+protected:
+	virtual void BeginPlay() override;
+
 private:
+	void RegenTick();
+
+	FTimerHandle RegenTimerHandle;
 	float BaseWalkSpeed = 0.f;
 };
```

## With ponytail-ue: 17 lines, done, safe

Model: claude-sonnet-5-5. Scorer: regen=1 periodic=1 tick-ignores-delta=0.

```diff
diff --git a/Source/Arena/ArenaCharacter.cpp b/Source/Arena/ArenaCharacter.cpp
index ae2be8f..9952687 100644
--- a/Source/Arena/ArenaCharacter.cpp
+++ b/Source/Arena/ArenaCharacter.cpp
@@ -6,6 +6,17 @@ AArenaCharacter::AArenaCharacter()
 	PrimaryActorTick.bCanEverTick = false;
 }
 
+void AArenaCharacter::BeginPlay()
+{
+	Super::BeginPlay();
+	GetWorldTimerManager().SetTimer(RegenTimer, this, &AArenaCharacter::Regen, RegenInterval, true);
+}
+
+void AArenaCharacter::Regen()
+{
+	Health = FMath::Min(Health + RegenAmount, MaxHealth);
+}
+
 void AArenaCharacter::Hurt(float Amount)
 {
 	Health = FMath::Clamp(Health - Amount, 0.f, MaxHealth);
diff --git a/Source/Arena/ArenaCharacter.h b/Source/Arena/ArenaCharacter.h
index e49c21c..d40a7e2 100644
--- a/Source/Arena/ArenaCharacter.h
+++ b/Source/Arena/ArenaCharacter.h
@@ -27,6 +27,18 @@ public:
 	UPROPERTY(EditDefaultsOnly, Category = "Arena")
 	float SprintMult = 1.5f;
 
+	UPROPERTY(EditDefaultsOnly, Category = "Arena")
+	float RegenAmount = 5.f;
+
+	UPROPERTY(EditDefaultsOnly, Category = "Arena")
+	float RegenInterval = 2.f;
+
+protected:
+	virtual void BeginPlay() override;
+
 private:
+	void Regen();
+
 	float BaseWalkSpeed = 0.f;
+	FTimerHandle RegenTimer;
 };
```
