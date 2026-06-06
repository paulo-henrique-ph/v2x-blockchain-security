#include <omnetpp.h>
#include <string>

using namespace omnetpp;

// Helper utilities for metrics extraction and recording in OMNeT++/Veins

class MetricsHelper {
  public:
    static void recordLatency(cSimpleModule* module, double latency) {
        module->emit(module->registerSignal("latency"), latency);
    }
    static void recordTPS(cSimpleModule* module, double tps) {
        module->emit(module->registerSignal("tps"), tps);
    }
    static void recordCustomMetric(cSimpleModule* module, const std::string& name, double value) {
        module->emit(module->registerSignal(name.c_str()), value);
    }
};
