# team

**Ticket:** "Let a client choose its team (0 or 1) on AArenaPlayerState. The team must replicate to everyone."

Verbatim `git diff` from a benchmark run (run directory `20261004-010115`), the median-LOC cell of each arm. Reproduce: `node benchmarks/run.js --all --examples`.

## Without ponytail-ue: 20 lines, done, safe

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
index b2aaef2..8ca4a02 100644
--- a/Source/Arena/ArenaPlayerState.h
+++ b/Source/Arena/ArenaPlayerState.h
@@ -10,9 +10,15 @@ class ARENA_API AArenaPlayerState : public APlayerState
 	GENERATED_BODY()
 
 public:
-	UPROPERTY(BlueprintReadOnly, Category = "Arena")
+	UPROPERTY(BlueprintReadOnly, Replicated, Category = "Arena")
 	int32 Team = 0;
 
+	/** Called by a client to choose its team (0 or 1). */
+	UFUNCTION(BlueprintCallable, Server, Reliable, WithValidation, Category = "Arena")
+	void ServerSetTeam(int32 NewTeam);
+
+	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;
+
 	UPROPERTY(BlueprintReadOnly, Category = "Arena")
 	int32 BestScore = 0;
 };
```

## With ponytail-ue: 20 lines, done, safe

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
index b2aaef2..38e6146 100644
--- a/Source/Arena/ArenaPlayerState.h
+++ b/Source/Arena/ArenaPlayerState.h
@@ -10,9 +10,15 @@ class ARENA_API AArenaPlayerState : public APlayerState
 	GENERATED_BODY()
 
 public:
-	UPROPERTY(BlueprintReadOnly, Category = "Arena")
+	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;
+
+	UPROPERTY(BlueprintReadOnly, Replicated, Category = "Arena")
 	int32 Team = 0;
 
+	// Client-callable: asks the server to set Team (0 or 1); replicates to everyone.
+	UFUNCTION(BlueprintCallable, Server, Reliable, WithValidation, Category = "Arena")
+	void ServerSetTeam(int32 NewTeam);
+
 	UPROPERTY(BlueprintReadOnly, Category = "Arena")
 	int32 BestScore = 0;
 };
```
