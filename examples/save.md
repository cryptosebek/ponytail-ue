# save

**Ticket:** "When AArenaPlayerState begins play, load BestScore from the "Player" save slot (UArenaSaveGame) without blocking the game thread."

Verbatim `git diff` from a benchmark run (run directory `20261004-010115`), the median-LOC cell of each arm. Reproduce: `node benchmarks/run.js --all --examples`.

## Without ponytail-ue: 28 lines, **build fails**, safe

Model: claude-sonnet-5-5. Scorer: load=1 background-thread=0 game-thread-hop=0. First build error: `Source\Arena\ArenaPlayerState.h(23,73): error C2061: syntax error: identifier 'USaveGame'`

```diff
diff --git a/Source/Arena/ArenaPlayerState.cpp b/Source/Arena/ArenaPlayerState.cpp
new file mode 100644
index 0000000..7688d9e
--- /dev/null
+++ b/Source/Arena/ArenaPlayerState.cpp
@@ -0,0 +1,28 @@
+#include "ArenaPlayerState.h"
+#include "ArenaSaveGame.h"
+#include "Kismet/GameplayStatics.h"
+
+namespace
+{
+	const FString PlayerSaveSlot = TEXT("Player");
+}
+
+void AArenaPlayerState::BeginPlay()
+{
+	Super::BeginPlay();
+
+	if (UGameplayStatics::DoesSaveGameExist(PlayerSaveSlot, 0))
+	{
+		UGameplayStatics::AsyncLoadGameFromSlot(
+			PlayerSaveSlot, 0,
+			FAsyncLoadGameFromSlotDelegate::CreateUObject(this, &AArenaPlayerState::OnBestScoreLoaded));
+	}
+}
+
+void AArenaPlayerState::OnBestScoreLoaded(const FString& SlotName, const int32 UserIndex, USaveGame* LoadedSave)
+{
+	if (const UArenaSaveGame* Save = Cast<UArenaSaveGame>(LoadedSave))
+	{
+		BestScore = Save->BestScore;
+	}
+}
diff --git a/Source/Arena/ArenaPlayerState.h b/Source/Arena/ArenaPlayerState.h
index b2aaef2..d2967e0 100644
--- a/Source/Arena/ArenaPlayerState.h
+++ b/Source/Arena/ArenaPlayerState.h
@@ -15,4 +15,10 @@ public:
 
 	UPROPERTY(BlueprintReadOnly, Category = "Arena")
 	int32 BestScore = 0;
+
+protected:
+	virtual void BeginPlay() override;
+
+private:
+	void OnBestScoreLoaded(const FString& SlotName, const int32 UserIndex, USaveGame* LoadedSave);
 };
```

## With ponytail-ue: 19 lines, done, safe

Model: claude-sonnet-5-5. Scorer: load=1 background-thread=0 game-thread-hop=0.

```diff
diff --git a/Source/Arena/ArenaPlayerState.cpp b/Source/Arena/ArenaPlayerState.cpp
new file mode 100644
index 0000000..f272f05
--- /dev/null
+++ b/Source/Arena/ArenaPlayerState.cpp
@@ -0,0 +1,19 @@
+#include "ArenaPlayerState.h"
+#include "ArenaSaveGame.h"
+#include "Kismet/GameplayStatics.h"
+
+void AArenaPlayerState::BeginPlay()
+{
+	Super::BeginPlay();
+
+	// Async load; the callback runs on the game thread. No save yet -> SaveGame is null, keep default.
+	UGameplayStatics::AsyncLoadGameFromSlot(TEXT("Player"), 0,
+		FAsyncLoadGameFromSlotDelegate::CreateWeakLambda(this,
+			[this](const FString&, const int32, USaveGame* SaveGame)
+			{
+				if (const UArenaSaveGame* Save = Cast<UArenaSaveGame>(SaveGame))
+				{
+					BestScore = Save->BestScore;
+				}
+			}));
+}
diff --git a/Source/Arena/ArenaPlayerState.h b/Source/Arena/ArenaPlayerState.h
index b2aaef2..4369125 100644
--- a/Source/Arena/ArenaPlayerState.h
+++ b/Source/Arena/ArenaPlayerState.h
@@ -15,4 +15,7 @@ public:
 
 	UPROPERTY(BlueprintReadOnly, Category = "Arena")
 	int32 BestScore = 0;
+
+protected:
+	virtual void BeginPlay() override;
 };
```
