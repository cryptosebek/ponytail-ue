# rename

**Ticket:** "Rename SprintMult on AArenaCharacter to SprintSpeedMultiplier."

Verbatim `git diff` from a benchmark run (`benchmarks/runs/20261004-003751`), the median-LOC cell of each arm. Reproduce: `node benchmarks/run.js --all --examples`.

## Without ponytail-ue: 2 lines, done, **unsafe**

Model: claude-sonnet-5-5. Scorer: renamed=1 core-redirect=0.

```diff
diff --git a/Source/Arena/ArenaCharacter.cpp b/Source/Arena/ArenaCharacter.cpp
index ae2be8f..c3872d4 100644
--- a/Source/Arena/ArenaCharacter.cpp
+++ b/Source/Arena/ArenaCharacter.cpp
@@ -18,5 +18,5 @@ void AArenaCharacter::Sprint(bool bEnable)
 	{
 		BaseWalkSpeed = Move->MaxWalkSpeed;
 	}
-	Move->MaxWalkSpeed = bEnable ? BaseWalkSpeed * SprintMult : BaseWalkSpeed;
+	Move->MaxWalkSpeed = bEnable ? BaseWalkSpeed * SprintSpeedMultiplier : BaseWalkSpeed;
 }
diff --git a/Source/Arena/ArenaCharacter.h b/Source/Arena/ArenaCharacter.h
index e49c21c..2dc8b33 100644
--- a/Source/Arena/ArenaCharacter.h
+++ b/Source/Arena/ArenaCharacter.h
@@ -25,7 +25,7 @@ public:
 	float Health = 100.f;
 
 	UPROPERTY(EditDefaultsOnly, Category = "Arena")
-	float SprintMult = 1.5f;
+	float SprintSpeedMultiplier = 1.5f;
 
 private:
 	float BaseWalkSpeed = 0.f;
```

## With ponytail-ue: 2 lines, done, safe

Model: claude-sonnet-5-5. Scorer: renamed=1 core-redirect=1.

```diff
diff --git a/Config/DefaultEngine.ini b/Config/DefaultEngine.ini
index 41158eb..4dac859 100644
--- a/Config/DefaultEngine.ini
+++ b/Config/DefaultEngine.ini
@@ -1,2 +1,5 @@
 [/Script/EngineSettings.GameMapsSettings]
 GlobalDefaultGameMode=/Script/Engine.GameModeBase
+
+[CoreRedirects]
++PropertyRedirects=(OldName="/Script/Arena.ArenaCharacter.SprintMult",NewName="/Script/Arena.ArenaCharacter.SprintSpeedMultiplier")
diff --git a/Source/Arena/ArenaCharacter.cpp b/Source/Arena/ArenaCharacter.cpp
index ae2be8f..c3872d4 100644
--- a/Source/Arena/ArenaCharacter.cpp
+++ b/Source/Arena/ArenaCharacter.cpp
@@ -18,5 +18,5 @@ void AArenaCharacter::Sprint(bool bEnable)
 	{
 		BaseWalkSpeed = Move->MaxWalkSpeed;
 	}
-	Move->MaxWalkSpeed = bEnable ? BaseWalkSpeed * SprintMult : BaseWalkSpeed;
+	Move->MaxWalkSpeed = bEnable ? BaseWalkSpeed * SprintSpeedMultiplier : BaseWalkSpeed;
 }
diff --git a/Source/Arena/ArenaCharacter.h b/Source/Arena/ArenaCharacter.h
index e49c21c..873ee83 100644
--- a/Source/Arena/ArenaCharacter.h
+++ b/Source/Arena/ArenaCharacter.h
@@ -25,7 +25,7 @@ public:
 	float Health = 100.f;
 
 	UPROPERTY(EditDefaultsOnly, Category = "Arena")
-	float SprintMult = 1.5f;
+	float SprintSpeedMultiplier =1.5f;
 
 private:
 	float BaseWalkSpeed = 0.f;
```
