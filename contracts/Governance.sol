pragma solidity ^0.8.0;

contract Governance {

    struct Request {
        string description;
        uint amount;
        address payable recipient;
        uint voteCount;
    }

    mapping(uint => Request) public requests;
    mapping(address => bool) public voters;

    uint public requestCount;

    function createRequest(string memory _desc, uint _amount, address payable _recipient) public {
        requestCount++;
        requests[requestCount] = Request(_desc, _amount, _recipient, 0);
    }

    function voteRequest(uint _id) public {
        require(!voters[msg.sender], "Already voted");

        voters[msg.sender] = true;
        requests[_id].voteCount++;
    }
}