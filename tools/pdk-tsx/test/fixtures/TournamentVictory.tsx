const victoryChoiceLabels = [
  'Send the money home',
  'Keep the purse',
  'Enter the next tournament',
];

type Props = {
  choice: number;
  confirmed: boolean;
  tournamentScore: number;
};

export function TournamentVictoryScreen({
  choice,
  confirmed,
  tournamentScore,
}: Props) {
  return (
    <Screen border="standard">
      {!confirmed ? (
        <Layout y={30} lineGap={20} marginX={40}>
          <Text>Champion of the Tilt</Text>
          <Text>at Eshkar's Ford!</Text>
          <Divider />
          <Text>The purse is yours.</Text>
          <Gap pixels={13} />
          {victoryChoiceLabels.map((label, i) => (
            <MenuItem selected={i === choice}>{label}</MenuItem>
          ))}
        </Layout>
      ) : (
        <Layout y={30}>
          <Text>{`Final Score: ${tournamentScore} pts`}</Text>
          <Divider />
          <Gap size="sm" />
          <Text>Victory!</Text>
          <Gap size="md" />
          <CursorSet y={195} />
          <Divider />
          <Gap pixels={1} />
          <ItalicText>Press A to return.</ItalicText>
        </Layout>
      )}
    </Screen>
  );
}
