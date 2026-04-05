type Props = {
  bestScore: number;
  hasSave: boolean;
  titleChoice: number;
};

export function TitleScreen({ bestScore, hasSave, titleChoice }: Props) {
  return (
    <Screen border="standard">
      <Layout y={80}>
        {' '}
        {/* raw y — intentional non-centered placement; align unavailable (conditionals) */}
        <Text>Steady On!</Text>
        <Gap size="xs" />
        {bestScore > 0 && <Text>{`Best: ${bestScore} pts`}</Text>}
        <Divider />
        <Gap size="sm" />
        {hasSave ? (
          <>
            <MenuItem selected={titleChoice === 0}>Continue</MenuItem>
            <MenuItem selected={titleChoice === 1}>New Game</MenuItem>
          </>
        ) : (
          <ItalicText>Press A to begin</ItalicText>
        )}
      </Layout>
    </Screen>
  );
}
