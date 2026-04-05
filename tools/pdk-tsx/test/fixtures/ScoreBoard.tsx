type Props = {
  names: string[];
  scores: number[];
};

export function ScoreBoardScreen({ names, scores }: Props) {
  return (
    <Screen border="standard">
      <Layout y={40} marginX={40} lineGap={20}>
        <Text>High Scores</Text>
        <Divider />
        {names.map((name, i) => (
          <>
            <Text align="left">{name}</Text>
            <CursorShift y={-20} />
            <Text align="right">{`${scores[i]} pts`}</Text>
          </>
        ))}
      </Layout>
    </Screen>
  );
}
