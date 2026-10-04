# save

**Ticket:** "When AArenaPlayerState begins play, load BestScore from the "Player" save slot (UArenaSaveGame) without blocking the game thread."

Verbatim `git diff` from a benchmark run (`benchmarks/runs/20261004-003751`), the median-LOC cell of each arm. Reproduce: `node benchmarks/run.js --all --examples`.

## Without ponytail-ue: 23 lines, **build fails**, safe

Model: claude-sonnet-5-5. Scorer: load=1 background-thread=0 game-thread-hop=0. First build error: `Source\Arena\ArenaPlayerState.h(23,73): error C2061: syntax error: identifier 'USaveGame'`

```diff
diff --git a/Source/Arena/ArenaPlayerState.cpp b/Source/Arena/ArenaPlayerState.cpp
new file mode 100644
index 0000000..74d3a84
--- /dev/null
+++ b/Source/Arena/ArenaPlayerState.cpp
@@ -0,0 +1,24 @@
+#include "ArenaPlayerState.h"
+
+#include "ArenaSaveGame.h"
+#include "Kismet/GameplayStatics.h"
+
+static const TCHAR* PlayerSaveSlot = TEXT("Player");
+
+void AArenaPlayerState::BeginPlay()
+{
+	Super::BeginPlay();
+
+	UGameplayStatics::AsyncLoadGameFromSlot(
+		PlayerSaveSlot, 0,
+		FAsyncLoadGameFromSlotDelegate::CreateUObject(this, &AArenaPlayerState::OnBestScoreLoaded));
+}
+
+void AArenaPlayerState::OnBestScoreLoaded(const FString& SlotName, const int32 UserIndex, USaveGame* LoadedSave)
+{
+	// Null when the slot doesn't exist yet; keep the default BestScore.
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
index 0000000..a7287a4
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
+	// Missing slot yields a null SaveGame; BestScore keeps its default.
+	UGameplayStatics::AsyncLoadGameFromSlot(TEXT("Player"), 0,
+		FAsyncLoadGameFromSlotDelegate::CreateWeakLambda(this,
+			[this](const FString&, const int32, USaveGame* Loaded)
+			{
+				if (const UArenaSaveGame* Save = Cast<UArenaSaveGame>(Loaded))
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
