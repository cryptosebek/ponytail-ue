# regen

**Ticket:** "Make AArenaCharacter regenerate 5 health every 2 seconds, up to MaxHealth."

Verbatim `git diff` from a benchmark run (`benchmarks/runs/20261004-003751`), the median-LOC cell of each arm. Reproduce: `node benchmarks/run.js --all --examples`.

## Without ponytail-ue: 18 lines, done, safe

Model: claude-sonnet-5-5. Scorer: regen=1 periodic=1 tick-ignores-delta=0.

```diff
diff --git a/Source/Arena/ArenaCharacter.cpp b/Source/Arena/ArenaCharacter.cpp
index ae2be8f..c9f1217 100644
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
+	GetWorldTimerManager().SetTimer(RegenTimerHandle, this, &AArenaCharacter::RegenHealth, RegenInterval, true);
+}
+
+void AArenaCharacter::RegenHealth()
+{
+	Health = FMath::Min(Health + RegenAmount, MaxHealth);
+}
+
 void AArenaCharacter::Hurt(float Amount)
 {
 	Health = FMath::Clamp(Health - Amount, 0.f, MaxHealth);
diff --git a/Source/Arena/ArenaCharacter.h b/Source/Arena/ArenaCharacter.h
index e49c21c..51683d6 100644
--- a/Source/Arena/ArenaCharacter.h
+++ b/Source/Arena/ArenaCharacter.h
@@ -27,6 +27,19 @@ public:
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
+	void RegenHealth();
+
+	FTimerHandle RegenTimerHandle;
+
 	float BaseWalkSpeed = 0.f;
 };
```

## With ponytail-ue: 15 lines, done, safe

Model: claude-sonnet-5-5. Scorer: regen=1 periodic=1 tick-ignores-delta=0.

```diff
diff --git a/Source/Arena/ArenaCharacter.cpp b/Source/Arena/ArenaCharacter.cpp
index ae2be8f..ada22f3 100644
--- a/Source/Arena/ArenaCharacter.cpp
+++ b/Source/Arena/ArenaCharacter.cpp
@@ -6,6 +6,16 @@ AArenaCharacter::AArenaCharacter()
 	PrimaryActorTick.bCanEverTick = false;
 }
 
+void AArenaCharacter::BeginPlay()
+{
+	Super::BeginPlay();
+	FTimerHandle Handle;
+	GetWorldTimerManager().SetTimer(Handle, [this]
+	{
+		Health = FMath::Min(Health + RegenAmount, MaxHealth);
+	}, RegenInterval, true);
+}
+
 void AArenaCharacter::Hurt(float Amount)
 {
 	Health = FMath::Clamp(Health - Amount, 0.f, MaxHealth);
diff --git a/Source/Arena/ArenaCharacter.h b/Source/Arena/ArenaCharacter.h
index e49c21c..9f767d5 100644
--- a/Source/Arena/ArenaCharacter.h
+++ b/Source/Arena/ArenaCharacter.h
@@ -27,6 +27,15 @@ public:
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
 	float BaseWalkSpeed = 0.f;
 };
```
