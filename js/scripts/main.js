"use strict";

const STYLES = {
    TEXT: {
        SMALL: {
            fontFamily: 'Courier',
            fontSize: 36,
            fill: 'white',
            align: 'left'
        },
    },
    SCREENS: {
        WIDTH: 800,
        HEIGHT: 600,
        REGULAR_SCALE: 1,
        SMALL_SCALE: 0.3,
    }
};
const INTERFACE = {
    TEXTS: {
        FUEL_LEVEL: 'fuel level: ',
        SIMULATION_IS_OVER: 'Simulation is over\n(rocket has been destroyed)\nTotal time: ',
        EPOCH: 'Epoch: ',
        BEST_SCORE: 'Best score: ',
        TOTAL_TIME: 'total time: ',
    },

};

const PHYSICS = {
    G: 9.81,  // Gravitational acceleration
    TIME_MULTIPLIER: 3,
    TIME_STEP: 0.06,
};
const ROCKET_CONFIGURATION = {
    INERTIA: {
        ROTATION: 3,
        MOVE: 0.04,
    },
    SIDE_ENGINES_POWER_MULTIPLIER: 0.5, // main engine is *twice* as powerful as side engines
    FUEL_CONSUMPTION: 0.008,
    SPRITE: {
        ROCKET_SIZE: {
            WIDTH: 60,
            HEIGHT: 78,
        },
        FIRE_SIZE: {
            MAIN: 55,
            SIDE: 15,
        }
    }
};

class Utils{
    static randomChoice(arr){
        return arr[Math.floor(Math.random() * arr.length)];
    }
}


class Rocket{
    constructor({velocityX, velocityY, rotation, rotationVelocity, fuelLevel}){
        this.velocityX = velocityX || 0;
        this.velocityY = velocityY || 0;
        this.rotationVelocity = rotationVelocity || 0;

        this.rotation = rotation || 0;
        this.fuelLevel = fuelLevel || 1; // 100%
        this.topEnginePower = 0;
        this.bottomEnginePower = 0;
        this.mainEnginePower = 0;
    }
    reset(){
        this.velocityX = 0;
        this.velocityY = 0;
        this.rotationVelocity = 0;
        this.rotation = 0;
        this.fuelLevel = 1;
        this.topEnginePower = 0;
        this.bottomEnginePower = 0;
        this.mainEnginePower = 0;
    }
    setPowerLevels({topEnginePower, bottomEnginePower, mainEnginePower}){
        //     /|\
        //    /   \
        //   |-----|   <- top engine
        //   |     |
        //   |     |
        //   |     |
        //  <|-----|>  <- bottom engine
        //   =======
        //     VVV    <- main engine
        if(this.fuelLevel <= 0){
            topEnginePower = bottomEnginePower = 0;
            mainEnginePower = -1;
        }
        mainEnginePower = (mainEnginePower + 1) / 2; // projection [-1; 1] -> [0; 1]
        this.topEnginePower = topEnginePower || this.topEnginePower;
        this.bottomEnginePower = bottomEnginePower || this.bottomEnginePower;
        this.mainEnginePower = mainEnginePower || this.mainEnginePower;
        // since (0 || x) === x, this is required to properly update powers
        if(topEnginePower === 0) this.topEnginePower = topEnginePower;
        if(bottomEnginePower === 0) this.bottomEnginePower = bottomEnginePower;
        if(mainEnginePower === 0) this.mainEnginePower = mainEnginePower;
    }
    getPowerLevels(){
        return {
            topEnginePower: this.topEnginePower,
            bottomEnginePower: this.bottomEnginePower,
            mainEnginePower: this.mainEnginePower,
        }
    }
    simulate({debug, timeDelta} = {debug: false}){
        let topEnginePower = this.topEnginePower,
            bottomEnginePower = this.bottomEnginePower,
            mainEnginePower = this.mainEnginePower;
        this.fuelLevel -= ROCKET_CONFIGURATION.FUEL_CONSUMPTION * timeDelta * (
            Math.abs(topEnginePower) + Math.abs(bottomEnginePower) + Math.abs(mainEnginePower)
        );
        this.fuelLevel = Math.max(this.fuelLevel, 0);
        let accelerationX = 0, accelerationY = 0;
        if(this.fuelLevel > 0) {
            let rotationAcceleration = (topEnginePower - bottomEnginePower) / ROCKET_CONFIGURATION.INERTIA.ROTATION;
            let sideEnginesSumPower = 0;
            if (Math.sign(topEnginePower) === Math.sign(bottomEnginePower)) {
                // choose which is closer to the 0
                if (Math.sign(topEnginePower) > 0)
                    sideEnginesSumPower = Math.min(topEnginePower, bottomEnginePower);
                else
                    sideEnginesSumPower = Math.max(topEnginePower, bottomEnginePower);
            }
            this.rotationVelocity += timeDelta * rotationAcceleration;
            accelerationX = (mainEnginePower * Math.sin(-this.rotation) - sideEnginesSumPower * Math.cos(this.rotation));
            accelerationY = (mainEnginePower * Math.cos(-this.rotation) - sideEnginesSumPower * Math.sin(this.rotation));
            accelerationX /= ROCKET_CONFIGURATION.INERTIA.MOVE;
            accelerationY /= ROCKET_CONFIGURATION.INERTIA.MOVE;
        }
        accelerationY -= PHYSICS.G;

        this.velocityX += timeDelta * accelerationX;
        this.velocityY += timeDelta * accelerationY;
        this.rotation += timeDelta * this.rotationVelocity;
        this.rotation = this.rotation % (2 * Math.PI);
        return {velocityX: this.velocityX, velocityY: this.velocityY};
    }
}

const rocketTexture = PIXI.Texture.from('img/rocket.png');
const fireTexture = PIXI.Texture.from('img/fire.png');
const fuelBarrelTexture = PIXI.Texture.from('img/fuel.png');

function getBarrelSprite() {
    let barrel = new PIXI.Sprite(fuelBarrelTexture);
    barrel.anchor.set(0.5);
    barrel.width = 40;
    barrel.height = 40;
    return barrel;
}

function getFireSprite(rotation, x, y, width, height) {
    let fire = new PIXI.Sprite(fireTexture);
    fire.width = width || 0;
    fire.height = height || 0;
    fire.anchor.set(0.5, 1);
    fire.rotation = rotation;
    fire.position.set(x, y);
    return fire;
}

function getRocketSprite({x, y}) {
    let container = new PIXI.Container();
    container.position.set(x, y);
    let rocketSprite = new PIXI.Sprite(rocketTexture);
    rocketSprite.width = ROCKET_CONFIGURATION.SPRITE.ROCKET_SIZE.WIDTH;
    rocketSprite.height = ROCKET_CONFIGURATION.SPRITE.ROCKET_SIZE.HEIGHT;
    rocketSprite.anchor.set(0.5);
    rocketSprite.position.set(0, 0);
    rocketSprite.rotation = 0;
    container.addChild(rocketSprite);
    let mainFire = getFireSprite(Math.PI, 0, 39);
    let topRightFire = getFireSprite(Math.PI / 2, 13, -10);
    let topLeftFire = getFireSprite(-Math.PI / 2, -13, -10);
    let bottomRightFire = getFireSprite(Math.PI / 2, 13, 25);
    let bottomLeftFire = getFireSprite(-Math.PI / 2, -13, 25);
    container.addChild(mainFire);
    container.addChild(topRightFire);
    container.addChild(topLeftFire);
    container.addChild(bottomRightFire);
    container.addChild(bottomLeftFire);
    container.updateFireLevels = function ({topEnginePower, bottomEnginePower, mainEnginePower}) {
       mainFire.width = mainFire.height = ROCKET_CONFIGURATION.SPRITE.FIRE_SIZE.MAIN * mainEnginePower / 2;
       if(topEnginePower > 0){
           topRightFire.width = topRightFire.height = 0;
           topLeftFire.width = topLeftFire.height = ROCKET_CONFIGURATION.SPRITE.FIRE_SIZE.SIDE * topEnginePower;
       } else {
           topLeftFire.width = topLeftFire.height = 0;
           topRightFire.width = topRightFire.height = -ROCKET_CONFIGURATION.SPRITE.FIRE_SIZE.SIDE * topEnginePower;
       }
       if(bottomEnginePower > 0){
           bottomRightFire.width = bottomRightFire.height = 0;
           bottomLeftFire.width = bottomLeftFire.height = ROCKET_CONFIGURATION.SPRITE.FIRE_SIZE.SIDE * bottomEnginePower;
       } else {
           bottomLeftFire.width = bottomLeftFire.height = 0;
           bottomRightFire.width = bottomRightFire.height = -ROCKET_CONFIGURATION.SPRITE.FIRE_SIZE.SIDE * bottomEnginePower;
       }
    };

    return container;
}

class Simulation{
    constructor({element, width, height, scale, useRealTime, skipFramesCount}){
        this.width = width;
        this.height = height;
        this.failed = false;
        this.totalTime = 0;
        this.scale = scale || 1;
        this.useRealTime = useRealTime || false;
        this.skipFramesCount = skipFramesCount || 1;
        this.onRenderCallback = function({rocket, state}){};
        this.onEndCallback = function({totalTime}){};
        this.barrelsCollected = 0;

        let app = new PIXI.Application({width: width * scale, height: height * scale, backgroundColor : 0x1099bb, forceCanvas: true});
        app.stage.scale.x = scale;
        app.stage.scale.y = scale;

        this.app = app;

        this.rocket = {
            model: new Rocket({}),
            position: {x: width / 2, y: height / 2},
            sprite: undefined,
        };
        this.rocket.sprite = getRocketSprite(this.rocket.position);
        this.fuelBarrel = getBarrelSprite();
        this.resetBarrel();

        this.fuelText = new PIXI.Text(INTERFACE.TEXTS.FUEL_LEVEL, STYLES.TEXT.SMALL);
        this.totalTimeText = new PIXI.Text(INTERFACE.TEXTS.TOTAL_TIME, STYLES.TEXT.SMALL);
        this.totalTimeText.position.set(0, 36);

        let self = this;
        app.ticker.add(function (timeDelta) {
            self.simulate(timeDelta);
        });

        app.stage.addChild(this.fuelText);
        app.stage.addChild(this.totalTimeText)
        app.stage.addChild(this.rocket.sprite);
        app.stage.addChild(this.fuelBarrel);

        element.appendChild(this.app.view);
        this.stop();
    }
    syncSpriteAndModel(){
        let {x, y} = this.rocket.position;
        this.rocket.sprite.position.set(x, y);
        this.rocket.sprite.rotation = this.rocket.model.rotation;
        this.fuelText.text = INTERFACE.TEXTS.FUEL_LEVEL + (this.rocket.model.fuelLevel * 100).toFixed(3);
        this.totalTimeText.text = INTERFACE.TEXTS.TOTAL_TIME + (this.totalTime).toFixed(2);
    }
    endSimulation(){
        this.failed = true;
        let totalTime = this.totalTime;
        this.failedText = this.failedText ||
            new PIXI.Text('', STYLES.TEXT.SMALL);
        this.failedText.text = INTERFACE.TEXTS.SIMULATION_IS_OVER + totalTime.toFixed(2);
        this.failedText.visible = true;
        this.failedText.anchor.set(0.5);
        this.failedText.position.set(this.width / 2, this.height / 2);
        this.app.stage.addChild(this.failedText);
        this.onEndCallback({totalTime});
    }
    simulate(timeDelta){
        let skipFramesCount = this.skipFramesCount;
        if(this.useRealTime)
            timeDelta *= PIXI.settings.TARGET_FPMS;
        else {
            // Trick to avoid lag for large amount of simulations
            skipFramesCount *= Math.floor(Math.max(timeDelta, 1));
            timeDelta = PHYSICS.TIME_STEP;
        }

        for(let i = 0; i < skipFramesCount; i++) {
            this.onRenderCallback({rocket: this.rocket, state: this.getSimulationState()});
            if (this.failed) return;
            this.totalTime += timeDelta;
            this.rocket.model.simulate({timeDelta});
            this.rocket.position.x -= timeDelta * this.rocket.model.velocityX;
            this.rocket.position.y -= timeDelta * this.rocket.model.velocityY;
            if (
                this.rocket.position.x < 0 || this.rocket.position.x > this.width ||
                this.rocket.position.y < 0 || this.rocket.position.y > this.height
            ) {
                this.endSimulation();
            }
            if(this.barrelAndRocketCollide()){
                this.resetBarrel();
                this.rocket.model.fuelLevel = 1;
            }
            this.syncSpriteAndModel();
            this.rocket.sprite.updateFireLevels(this.rocket.model.getPowerLevels());
        }
    }
    getSimulationState(){
        return [
            this.rocket.model.velocityX,
            this.rocket.model.velocityY,
            (this.width - this.rocket.position.x) / this.width,
            (this.height - this.rocket.position.y) / this.height,
            this.rocket.position.x / this.width,
            this.rocket.position.y / this.height,
            this.rocket.model.rotationVelocity,
            this.rocket.model.rotation,
            this.rocket.model.fuelLevel,
            (this.fuelBarrel.position.x - this.rocket.position.x) / this.width,
            (this.fuelBarrel.position.y - this.rocket.position.y) / this.height,
        ]
    }
    SUPER_UNPREDICTABLE_SEQ_01 = [1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0];
    SUPER_UNPREDICTABLE_SEQ_012 = [2, 1, 2, 0, 1, 0, 0, 1, 2, 0, 1, 2];
    resetBarrel(){
        this.barrelsCollected += 1;
        let barrelPos = this.getNextBarrelPosition();

        this.fuelBarrel.position.set(barrelPos.x, barrelPos.y);
    }
    getNextBarrelPosition(){
        return {
            x: this.width * 0.2 + this.width * 0.6 * this.SUPER_UNPREDICTABLE_SEQ_012[this.barrelsCollected % 12] / 2,
            y: this.height * 0.55 + this.height * 0.1 * this.SUPER_UNPREDICTABLE_SEQ_01[this.barrelsCollected % 12],
        }
    }
    barrelAndRocketCollide(){
        return Math.sqrt(
            (this.rocket.position.x - this.fuelBarrel.position.x) * (this.rocket.position.x - this.fuelBarrel.position.x) +
            (this.rocket.position.y - this.fuelBarrel.position.y) * (this.rocket.position.y - this.fuelBarrel.position.y)
        ) < 40;
    }
    reset(){
        this.rocket.position = {x: this.width / 2, y: this.height / 2};
        this.rocket.model.reset();
        this.totalTime = 0;
        this.failed = false;
        this.syncSpriteAndModel();
        if(this.failedText){
            this.failedText.visible = false;
        }
        this.barrelsCollected = 0;
        this.resetBarrel();
    }
    start(){
        this.app.start();
    }
    stop(){
        this.app.stop();
    }
}

class RocketController{
    CONFIG = {
        INPUT_SIZE: 11,
        OUTPUT_SIZE: 3,
        MIDDLE_LAYER_SIZES: [12, 15, 9, 6]
    };
    constructor({brain, NNArchitecture}){
        this.NNArchitecture = NNArchitecture || this.CONFIG.MIDDLE_LAYER_SIZES;
        this.brain = brain || this.getRandomBrain();
    }
    replaceBrain(brain){
        this.brain = this.copyBrain(brain);
    }
    copyBrain(brain){
        let newBrain = [];
        for (let i = 0; i < brain.length; i++) {
            newBrain.push(brain[i].clone())
        }
        return newBrain;
    }
    mutateBrain({brain, fullLayerMutation, aggressiveness, macChange}){
        fullLayerMutation = fullLayerMutation || true;
        aggressiveness = aggressiveness || 0.1;
        macChange = macChange || 0.1;
        if(fullLayerMutation){
            brain = this.copyBrain(brain);
            for (let i = 0; i < brain.length; i++) {
                if (Math.random() < aggressiveness) {
                    brain[i] = this.getRandomLayer(brain[i].shape);
                }
            }
            return brain;
        } else {
            brain = this.copyBrain(brain);
            for(let i = 0; i < brain.length; i++){
                let shape = brain[i].shape;
                for(let j = 0; j < shape[0]; j++)
                    if(Math.random() < aggressiveness)
                    for(let k = 0; k < shape[1]; k++)
                        brain[i].set(j, k, brain[i].get() * (1 - macChange) + (Math.random()*2 - 1)*macChange)
            }
        }
    }
    crossBrains({brain1, brain2, layerCrossing, firstBrainPriority}){
        layerCrossing = layerCrossing || false;
        firstBrainPriority = firstBrainPriority || 0.5;
        if(!layerCrossing){
            let brain3 = [];
            for (let i = 0; i < brain1.length; i++) {
                if (Math.random() < firstBrainPriority) {
                    brain3.push(brain1[i].clone());
                } else {
                    brain3.push(brain2[i].clone());
                }
            }
            return brain3;
        } else {
            let brain3 = [];
            for (let i = 0; i < brain1.length; i++){
                brain3.push(
                    brain1[i].multiply(firstBrainPriority).add(
                        brain2[i].multiply(1 - firstBrainPriority)
                    )
                )
            }
            return brain3;
        }
    }

    getRandomBrain(){
        let res = [];
        res.push(this.getRandomLayer([
            this.CONFIG.INPUT_SIZE + 1,
            this.NNArchitecture[0]
        ]));
        for(let i = 1; i < this.NNArchitecture.length; i++){
            res.push(this.getRandomLayer([
                this.NNArchitecture[i - 1] + 1,
                this.NNArchitecture[i],
            ]));
        }
        res.push(this.getRandomLayer([
            this.NNArchitecture[this.NNArchitecture.length - 1] + 1,
            this.CONFIG.OUTPUT_SIZE,
        ]));

        return res;
    }
    getRandomLayer(shape){
        return nj.random(shape).multiply(2).subtract(1);
    }
    decisionMaker({rocket, state}){
        let output = this.getOutput(state);
        rocket.model.setPowerLevels({
            topEnginePower: output.get(0),
            bottomEnginePower: output.get(1),
            mainEnginePower: output.get(2),
        })
    }
    getOutput(input){
        for (let i = 0; i < this.brain.length; i++) {
            input = nj.tanh(nj.dot(nj.concatenate([1, input]), this.brain[i]));
        }
        return input;
    }
    getBrainSignature(brain){
        brain = brain || this.brain;
        let res = 0;
        for(let i = 0; i < this.brain.length; i++)
            res += brain[i].sum();
        return res;
    }
}

class NaturalRocketSelection{
    constructor({
                    countOfSimulations, NNArchitecture,
                    createVisualizationOuterElement, scale, skipFramesCount,
                    epochCounterElement, bestScoreElement,
    }){
        skipFramesCount = skipFramesCount || 1;
        this.countOfSimulations = countOfSimulations || 1;
        this.simulations = new Array(countOfSimulations);
        this.activeSimulations = countOfSimulations;
        scale = scale || STYLES.SCREENS.SMALL_SCALE;
        this.epochCounter = epochCounterElement;
        this.bestScore = bestScoreElement;
        this.NNArchitecture = NNArchitecture;

        this.epoch = 1;
        for(let i = 0; i < countOfSimulations; i++){
            let element = createVisualizationOuterElement(i);
            this.simulations[i] = {
                score: 0,
                controller: new RocketController({NNArchitecture: this.NNArchitecture}),
                index: i,
                simulation: new Simulation({
                    element,
                    width: STYLES.SCREENS.WIDTH,
                    height: STYLES.SCREENS.HEIGHT,
                    scale: scale,
                    skipFramesCount: skipFramesCount,
                })
            };
            this.bindAutoControl(this.simulations[i].simulation, this.simulations[i].controller);
            this.bindSimulationOver(this.simulations[i].simulation, i);
        }
        this.start();
    }
    start(){
        for(let i = 0; i < this.countOfSimulations; i++){
            this.simulations[i].simulation.start();
        }
    }
    stop(){
        for(let i = 0; i < this.countOfSimulations; i++){
            this.simulations[i].simulation.stop();
        }
    }
    bindAutoControl(simulation, controller) {
      simulation.onRenderCallback = function ({rocket, state}) {
          controller.decisionMaker({rocket, state});
      }
    }
    bindSimulationOver(simulation, index) {
        let self = this;
        simulation.onEndCallback = function ({totalTime}) {
            self.simulations[index].score = totalTime;
            self.activeSimulations--;
            if (self.activeSimulations === 0)
                self.onAllSimulationsEnd();
        };
    }
    onAllSimulationsEnd() {
        this.stop();
        let sortedSimulations = this.simulations.slice()
            .sort((a, b) => {
                return b.score - a.score;
            });
        let bound1 = Math.floor(this.countOfSimulations / 3),
            bound3 = Math.floor(2 * this.countOfSimulations / 3),
            bound2 = Math.floor(3 * this.countOfSimulations / 4);

        let best = sortedSimulations.slice(0, bound1);
        let mid1 = sortedSimulations.slice(bound1, bound2);
        let mid2 = sortedSimulations.slice(bound2, bound3);
        let worst = sortedSimulations.slice(bound3);

        for (let i = 0; i < mid2.length; i++) {
            let newBrain = Utils.randomChoice(best).controller.brain;
            newBrain = mid2[i].controller.mutateBrain({brain: newBrain, aggressiveness: 0.1, fullLayerMutation: true});
            mid2[i].controller.replaceBrain(newBrain);
        }
        for (let i = 0; i < mid1.length; i++) {
            let newBrain = Utils.randomChoice(best).controller.brain;
            newBrain = mid1[i].controller.mutateBrain({
                brain: newBrain,
                aggressiveness: 0.1,
                fullLayerMutation: false,
                macChange: 0.01
            });
            mid1[i].controller.replaceBrain(newBrain);
        }
        for (let i = 0; i < worst.length; i++) {
            let donor1 = Utils.randomChoice(best).controller.brain;
            let donor2 = Utils.randomChoice(best).controller.brain;
            let newBrain = worst[i].controller.crossBrains({brain1: donor1, brain2: donor2, layerCrossing: true});

            worst[i].controller.replaceBrain(newBrain);
        }
        // we want to have unique brains
        let s = new Set();
        for(let i = 0; i < sortedSimulations.length; i++) {
            while (s.has(sortedSimulations[i].controller.getBrainSignature())) {
                sortedSimulations[i].controller.replaceBrain(
                    sortedSimulations[i].controller.mutateBrain({
                        brain: sortedSimulations[i].controller.brain,
                        aggressiveness: 0.1,
                        macChange: 0.01,
                        fullLayerMutation: false
                    })
                )
            }
            s.add(sortedSimulations[i].controller.getBrainSignature());
        }

        for(let i = 0; i < this.countOfSimulations; i++){
            // TODO: make this optimization optional
            // if(best.indexOf(this.simulations[i]) !== -1)
            //     continue;
            this.simulations[i].simulation.reset();
        }
        // TODO: make this optimization optional
        // this.activeSimulations = this.countOfSimulations - best.length;
        this.activeSimulations = this.countOfSimulations

        this.epoch++;
        this.epochCounter.innerText = this.epoch;
        this.bestScore.innerText = best[0].score.toFixed(2);
        this.start();
    }
    saveBrains(){
        let brains = this.simulations.map(simulation => simulation.controller.brain.map(layer => layer.tolist()));

        function download(content, fileName, contentType) {
            var a = document.createElement("a");
            var file = new Blob([content], {type: contentType});
            a.href = URL.createObjectURL(file);
            a.download = fileName;
            a.click();
        }
        download(brains, 'json.txt', 'text/plain');
    }
    changeSimulationSpeed(newSpeed){
        this.simulations.map(simulation => {
                simulation.simulation.skipFramesCount = newSpeed;
        });
    }
}


class ControlableSimulation{
    constructor({element, width, height, scale}){
        this.simulation = new Simulation({
            element: element || document.body,
            useRealTime: true,
            width: width || STYLES.SCREENS.WIDTH,
            height: height || STYLES.SCREENS.HEIGHT,
            scale: scale || STYLES.SCREENS.REGULAR_SCALE,
        });
        this.bindKeyboardControl(this.simulation);
        this.simulation.start();
    }
    bindKeyboardControl(simulation){
        document.addEventListener('keydown', function (event) {
            switch (event.code) {
                case 'Space':
                    simulation.rocket.model.setPowerLevels({mainEnginePower: 1});
                    break;
                case 'ArrowLeft':
                    simulation.rocket.model.setPowerLevels({bottomEnginePower: 1});
                    break;
                case 'ArrowRight':
                    simulation.rocket.model.setPowerLevels({bottomEnginePower: -1});
                    break;
                case 'KeyA':
                    simulation.rocket.model.setPowerLevels({topEnginePower: 1});
                    break;
                case 'KeyD':
                    simulation.rocket.model.setPowerLevels({topEnginePower: -1});
                    break;
                case 'Enter':
                    simulation.reset();
                    break;
            }
        });
        document.addEventListener('keyup', function (event) {
            switch (event.code) {
                case 'Space':
                    simulation.rocket.model.setPowerLevels({mainEnginePower: -1});
                    break;
                case 'ArrowLeft':
                    simulation.rocket.model.setPowerLevels({bottomEnginePower: 0});
                    break;
                case 'ArrowRight':
                    simulation.rocket.model.setPowerLevels({bottomEnginePower: 0});
                    break;
                case 'KeyA':
                    simulation.rocket.model.setPowerLevels({topEnginePower: 0});
                    break;
                case 'KeyD':
                    simulation.rocket.model.setPowerLevels({topEnginePower: 0});
                    break;
            }
        });
    }
}


