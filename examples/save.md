# save

**Ticket:** "When AArenaPlayerState begins play, load BestScore from the "Player" save slot (UArenaSaveGame) without blocking the game thread."

Verbatim `git diff` from a benchmark run (run directory `20261004-023525`), the median-LOC cell of each arm. Reproduce: `node benchmarks/run.js --all --examples`.

## Without ponytail-ue: 25 lines, **build fails**, safe

Model: claude-sonnet-5-5. Scorer: load=1 background-thread=0 game-thread-hop=0. First build error: `Source\Arena\ArenaPlayerState.h(23,73): error C2061: syntax error: identifier 'USaveGame'`

```diff
diff --git a/Source/Arena/ArenaPlayerState.cpp b/Source/Arena/ArenaPlayerState.cpp
new file mode 100644
index 0000000..09945e0
--- /dev/null
+++ b/Source/Arena/ArenaPlayerState.cpp
@@ -0,0 +1,25 @@
+#include "ArenaPlayerState.h"
+#include "ArenaSaveGame.h"
+#include "Kismet/GameplayStatics.h"
+
+static const FString PlayerSaveSlot = TEXT("Player");
+
+void AArenaPlayerState::BeginPlay()
+{
+	Super::BeginPlay();
+
+	if (UGameplayStatics::DoesSaveGameExist(PlayerSaveSlot, 0))
+	{
+		FAsyncLoadGameFromSlotDelegate LoadedDelegate;
+		LoadedDelegate.BindUObject(this, &AArenaPlayerState::OnBestScoreLoaded);
+		UGameplayStatics::AsyncLoadGameFromSlot(PlayerSaveSlot, 0, LoadedDelegate);
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

## With ponytail-ue: 21 lines, **build fails**, safe

Model: claude-sonnet-5-5. Scorer: load=1 background-thread=0 game-thread-hop=0. First build error: `Source\Arena\ArenaPlayerState.h(23,73): error C2061: syntax error: identifier 'USaveGame'`

```diff
diff --git a/Source/Arena/ArenaPlayerState.cpp b/Source/Arena/ArenaPlayerState.cpp
new file mode 100644
index 0000000..0726617
--- /dev/null
+++ b/Source/Arena/ArenaPlayerState.cpp
@@ -0,0 +1,20 @@
+#include "ArenaPlayerState.h"
+#include "ArenaSaveGame.h"
+#include "Kismet/GameplayStatics.h"
+
+void AArenaPlayerState::BeginPlay()
+{
+	Super::BeginPlay();
+
+	UGameplayStatics::AsyncLoadGameFromSlot(TEXT("Player"), 0,
+		FAsyncLoadGameFromSlotDelegate::CreateUObject(this, &AArenaPlayerState::OnBestScoreLoaded));
+}
+
+void AArenaPlayerState::OnBestScoreLoaded(const FString& SlotName, const int32 UserIndex, USaveGame* SaveGame)
+{
+	// No save yet: SaveGame is null, keep the default BestScore.
+	if (const UArenaSaveGame* Save = Cast<UArenaSaveGame>(SaveGame))
+	{
+		BestScore = Save->BestScore;
+	}
+}
diff --git a/Source/Arena/ArenaPlayerState.h b/Source/Arena/ArenaPlayerState.h
index b2aaef2..9e45a72 100644
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
+	void OnBestScoreLoaded(const FString& SlotName, const int32 UserIndex, USaveGame* SaveGame);
 };
```
