#include "blockchain-integration-base.h"
#include <omnetpp.h>
#include <string>
#include <chrono>

using namespace omnetpp;

class IotaIntegrationModule : public BlockchainIntegrationBase {
protected:
    virtual void initialize() override {
        EV << "IotaIntegrationModule initialized" << endl;
    }
    virtual void handleMessage(cMessage *msg) override {
        std::string payload = msg->getName();
        submitTransaction(payload);
        delete msg;
    }
    virtual void submitTransaction(const std::string& payload) override {
        auto start = std::chrono::steady_clock::now();
        // ... send payload to IOTA bridge ...
        simtime_t confirmationDelay = SimTime(0.05, SIMTIME_S);
        scheduleAt(simTime() + confirmationDelay, new cMessage("IotaTxConfirmed"));
        auto end = std::chrono::steady_clock::now();
        double latency = std::chrono::duration<double, std::milli>(end - start).count();
        recordMetric("e2eLatency", latency);
    }
    virtual void recordMetric(const std::string& metric, double value) override {
        emit(registerSignal(metric.c_str()), value);
    }
};

Define_Module(IotaIntegrationModule);
