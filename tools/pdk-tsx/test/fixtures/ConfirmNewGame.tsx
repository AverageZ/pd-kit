type Props = {
  choice: number;
};

export function ConfirmNewGameScreen({ choice }: Props) {
  return (
    <Screen border="standard">
      <Layout align="center">
        <Text>Start a new game?</Text>
        <Gap size="xs" />
        <ItalicText>This will erase all progress.</ItalicText>
        <Divider />
        <Gap size="sm" />
        <MenuItem selected={choice === 0}>No, go back</MenuItem>
        <MenuItem selected={choice === 1}>Yes, start over</MenuItem>
      </Layout>
    </Screen>
  );
}
