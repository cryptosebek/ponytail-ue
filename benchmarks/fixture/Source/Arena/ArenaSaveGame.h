#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "ArenaSaveGame.generated.h"

UCLASS()
class ARENA_API UArenaSaveGame : public USaveGame
{
	GENERATED_BODY()

public:
	UPROPERTY()
	int32 BestScore = 0;
};
