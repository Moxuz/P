const kafka = require('kafka-node');
const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });
const producer = new kafka.Producer(client);

// Check if the producer is ready and log messages
producer.on('ready', () => {
  console.log('Kafka Producer is connected and ready.');
});

producer.on('error', (error) => {
  console.error('Error in Kafka Producer:', error);
});

// Function to send log messages
const logMessage = (message) => {
  // Create a clean user object by removing MongoDB metadata and password
  const { password, $__ , $isNew, ...cleanUserData } = message.user;

  // Ensure we remove any unwanted internal Mongoose metadata
  const sanitizedMessage = {
    log: {
      level: message.level,
      message: message.message,
      user: cleanUserData, // Cleaned user object without password and Mongo metadata
    },
    timestamp: new Date().toISOString(),
  };

  const payloads = [
    {
      topic: 'serverlogs',
      messages: JSON.stringify(sanitizedMessage),
      partition: 0,
    },
  ];

  producer.send(payloads, (error, data) => {
    if (error) {
      console.error('Error sending message to Kafka:', error);
    } else {
      console.log('Message sent to Kafka:', data);
    }
  });
};

module.exports = logMessage;
