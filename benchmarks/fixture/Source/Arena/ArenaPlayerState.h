#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerState.h"
#include "ArenaPlayerState.generated.h"

UCLASS()
class ARENA_API AArenaPlayerState : public APlayerState
{
	GENERATED_BODY()

public:
	UPROPERTY(BlueprintReadOnly, Category = "Arena")
	int32 Team = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Arena")
	int32 BestScore = 0;
};
