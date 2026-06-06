#ifndef BLOCKCHAIN_INTEGRATION_BASE_H
#define BLOCKCHAIN_INTEGRATION_BASE_H

#include <string>
#include <omnetpp.h>

class BlockchainIntegrationBase : public omnetpp::cSimpleModule {
public:
    virtual void initialize() override = 0;
    virtual void handleMessage(omnetpp::cMessage *msg) override = 0;
    virtual void submitTransaction(const std::string& payload) = 0;
    virtual void recordMetric(const std::string& metric, double value) = 0;
};

#endif // BLOCKCHAIN_INTEGRATION_BASE_H
