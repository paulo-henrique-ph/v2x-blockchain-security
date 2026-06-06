// Veins application layer for V2V/V2I message generation and blockchain client interaction
#include <omnetpp.h>
#include <string>
#include "blockchain-integration-base.h"

using namespace omnetpp;

class VeinsBlockchainApp : public cSimpleModule {
protected:
    BlockchainIntegrationBase* blockchainModule;
    virtual void initialize() override {
        // Find and connect to blockchain module
        blockchainModule = check_and_cast<BlockchainIntegrationBase*>(getParentModule()->getSubmodule("blockchain"));
        EV << "VeinsBlockchainApp initialized" << endl;
    }
    virtual void handleMessage(cMessage *msg) override {
        // Generate V2V/V2I message and submit to blockchain
        std::string payload = "V2XMsg:" + std::string(msg->getName());
        blockchainModule->submitTransaction(payload);
        delete msg;
    }
};

Define_Module(VeinsBlockchainApp);
