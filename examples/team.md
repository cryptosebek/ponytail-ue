# team

**Ticket:** "Let a client choose its team (0 or 1) on AArenaPlayerState. The team must replicate to everyone."

Verbatim `git diff` from a benchmark run (run directory `20261004-023525`), the median-LOC cell of each arm. Reproduce: `node benchmarks/run.js --all --examples`.

## Without ponytail-ue: 25 lines, done, safe

Model: claude-sonnet-5-5. Scorer: replicated=1 server-rpc=1 range-check=1.

```diff
diff --git a/Source/Arena/ArenaPlayerState.cpp b/Source/Arena/ArenaPlayerState.cpp
new file mode 100644
index 0000000..09bc48b
--- /dev/null
+++ b/Source/Arena/ArenaPlayerState.cpp
@@ -0,0 +1,23 @@
+#include "ArenaPlayerState.h"
+#include "Net/UnrealNetwork.h"
+
+AArenaPlayerState::AArenaPlayerState()
+{
+	bReplicates = true;
+}
+
+void AArenaPlayerState::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
+{
+	Super::GetLifetimeReplicatedProps(OutLifetimeProps);
+	DOREPLIFETIME(AArenaPlayerState, Team);
+}
+
+bool AArenaPlayerState::ServerSetTeam_Validate(int32 NewTeam)
+{
+	return NewTeam == 0 || NewTeam == 1;
+}
+
+void AArenaPlayerState::ServerSetTeam_Implementation(int32 NewTeam)
+{
+	Team = NewTeam;
+}
diff --git a/Source/Arena/ArenaPlayerState.h b/Source/Arena/ArenaPlayerState.h
index b2aaef2..f0103c8 100644
--- a/Source/Arena/ArenaPlayerState.h
+++ b/Source/Arena/ArenaPlayerState.h
@@ -10,7 +10,15 @@ class ARENA_API AArenaPlayerState : public APlayerState
 	GENERATED_BODY()
 
 public:
-	UPROPERTY(BlueprintReadOnly, Category = "Arena")
+	AArenaPlayerState();
+
+	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;
+
+	/** Called by the owning client; the server validates and sets the team (0 or 1). */
+	UFUNCTION(BlueprintCallable, Server, Reliable, WithValidation, Category = "Arena")
+	void ServerSetTeam(int32 NewTeam);
+
+	UPROPERTY(BlueprintReadOnly, Replicated, Category = "Arena")
 	int32 Team = 0;
 
 	UPROPERTY(BlueprintReadOnly, Category = "Arena")
```

## With ponytail-ue: 19 lines, done, safe

Model: claude-sonnet-5-5. Scorer: replicated=1 server-rpc=1 range-check=1.

```diff
diff --git a/Source/Arena/ArenaPlayerState.cpp b/Source/Arena/ArenaPlayerState.cpp
new file mode 100644
index 0000000..27668d6
--- /dev/null
+++ b/Source/Arena/ArenaPlayerState.cpp
@@ -0,0 +1,18 @@
+#include "ArenaPlayerState.h"
+#include "Net/UnrealNetwork.h"
+
+void AArenaPlayerState::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
+{
+	Super::GetLifetimeReplicatedProps(OutLifetimeProps);
+	DOREPLIFETIME(AArenaPlayerState, Team);
+}
+
+bool AArenaPlayerState::ServerSetTeam_Validate(int32 NewTeam)
+{
+	return NewTeam == 0 || NewTeam == 1;
+}
+
+void AArenaPlayerState::ServerSetTeam_Implementation(int32 NewTeam)
+{
+	Team = NewTeam;
+}
diff --git a/Source/Arena/ArenaPlayerState.h b/Source/Arena/ArenaPlayerState.h
index b2aaef2..3c77031 100644
--- a/Source/Arena/ArenaPlayerState.h
+++ b/Source/Arena/ArenaPlayerState.h
@@ -10,9 +10,14 @@ class ARENA_API AArenaPlayerState : public APlayerState
 	GENERATED_BODY()
 
 public:
-	UPROPERTY(BlueprintReadOnly, Category = "Arena")
+	UPROPERTY(BlueprintReadOnly, Replicated, Category = "Arena")
 	int32 Team = 0;
 
+	UFUNCTION(BlueprintCallable, Server, Reliable, WithValidation, Category = "Arena")
+	void ServerSetTeam(int32 NewTeam);
+
 	UPROPERTY(BlueprintReadOnly, Category = "Arena")
 	int32 BestScore = 0;
+
+	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;
 };
```
