# regen

**Ticket:** "Make AArenaCharacter regenerate 5 health every 2 seconds, up to MaxHealth."

Verbatim `git diff` from a benchmark run (run directory `20261004-023525`), the median-LOC cell of each arm. Reproduce: `node benchmarks/run.js --all --examples`.

## Without ponytail-ue: 20 lines, done, safe

Model: claude-sonnet-5-5. Scorer: regen=1 periodic=1 tick-ignores-delta=0.

```diff
diff --git a/Source/Arena/ArenaCharacter.cpp b/Source/Arena/ArenaCharacter.cpp
index ae2be8f..ba3177c 100644
--- a/Source/Arena/ArenaCharacter.cpp
+++ b/Source/Arena/ArenaCharacter.cpp
@@ -6,6 +6,21 @@ AArenaCharacter::AArenaCharacter()
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
+	if (Health > 0.f)
+	{
+		Health = FMath::Min(Health + RegenAmount, MaxHealth);
+	}
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
index ae2be8f..0e09cc2 100644
--- a/Source/Arena/ArenaCharacter.cpp
+++ b/Source/Arena/ArenaCharacter.cpp
@@ -6,6 +6,18 @@ AArenaCharacter::AArenaCharacter()
 	PrimaryActorTick.bCanEverTick = false;
 }
 
+void AArenaCharacter::BeginPlay()
+{
+	Super::BeginPlay();
+	FTimerHandle Handle;
+	GetWorldTimerManager().SetTimer(Handle, this, &AArenaCharacter::Regen, RegenInterval, true);
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
index e49c21c..0e254fd 100644
--- a/Source/Arena/ArenaCharacter.h
+++ b/Source/Arena/ArenaCharacter.h
@@ -27,6 +27,17 @@ public:
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
 };
```
