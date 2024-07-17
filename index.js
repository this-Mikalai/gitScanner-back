const { ApolloServer, gql } = require("apollo-server");
const axios = require("axios");

const typeDefs = gql`
  type Query {
    listRepositories(token: String!, username: String!): [Repository]
    repositoryDetails(
      token: String!
      username: String!
      name: String!
    ): RepositoryDetails
  }

  type Repository {
    name: String
    size: Int
    owner: String
  }

  type RepositoryDetails {
    name: String
    size: Int
    owner: String
    isPrivate: Boolean
    fileCount: Int
    ymlContent: String
    webhooks: [String]
  }
`;

const resolvers = {
  Query: {
    listRepositories: async (_, { token, username }) => {
      const headers = { Authorization: `token ${token}` };
      const repos = await axios.get(
        `https://api.github.com/users/${username}/repos`,
        { headers }
      );
      return repos.data.map((repo) => ({
        name: repo.name,
        size: repo.size,
        owner: repo.owner.login,
      }));
    },
    repositoryDetails: async (_, { token, username, name }) => {
      const headers = { Authorization: `token ${token}` };
      const repo = await axios.get(
        `https://api.github.com/repos/${username}/${name}`,
        { headers }
      );

      const files = await axios.get(
        `https://api.github.com/repos/${username}/${name}/contents`,
        { headers }
      );
      const fileCount = files.data.length;

      const ymlFile = files.data.find((file) => file.name.endsWith(".yml"));
      let ymlContent = "";
      if (ymlFile) {
        const ymlResponse = await axios.get(ymlFile.download_url);
        ymlContent = ymlResponse.data;
      }

      const hooks = await axios.get(
        `https://api.github.com/repos/${username}/${name}/hooks`,
        { headers }
      );
      const webhooks = hooks.data.map((hook) => hook.config.url);

      return {
        name: repo.data.name,
        size: repo.data.size,
        owner: repo.data.owner.login,
        isPrivate: repo.data.private,
        fileCount,
        ymlContent,
        webhooks,
      };
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
  console.log(`🚀 Server started at ${url}`);
});
